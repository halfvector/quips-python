import os

from bson import ObjectId
from flask import Blueprint, g, current_app, url_for, request
from flask.ext.restful import reqparse
from mongoengine import Q
from werkzeug.datastructures import FileStorage

from app import tinyurl
from ..services import requires_auth
from ..mappers import QuipMapper, UserMapper
from ..models import User, Recording, Listen

bp = Blueprint('spa', __name__, template_folder='templates')


@bp.route('/api/create_recording')
def get_user_recording_stats():
    num_recordings = Recording.objects(Q(user=g.user['id'])).count()
    return {
        'num_recordings': num_recordings,
        'user': g.user
    }


@bp.route('/api/users/<string:user_id>')
def get_user_details(user_id):
    try:
        user = User.objects.get(Q(username=user_id))
        return UserMapper.to_web_dto(user), 200
    except User.DoesNotExist:
        return {}, 404


@bp.route('/api/users')
def get_users_list(user_id):
    return map(UserMapper.to_web_dto, User.objects), 200


@bp.route('/api/current_user')
def get_current_user():
    try:
        user = User.objects.get(id=g.user['id'])
        return UserMapper.to_web_dto(user), 200
    except User.DoesNotExist:
        return {}, 404


@bp.route('/api/quips/<string:quip_id>', methods=['GET'])
def get_recording(quip_id):
    tiny_id = ObjectId(tinyurl.decode(quip_id))

    record = Recording.objects.get_or_404(Q(id=tiny_id))
    if not record or not record.isPublic or record.user.id != g.user['id']:
        return {}, 404

    return QuipMapper.to_web_dto(record)


@requires_auth
@bp.route('/api/quips/<string:quip_id>', methods=['PUT'])
def update_recording(quip_id):
    parser = reqparse.RequestParser()
    parser.add_argument('duration', type=int, location='json')
    parser.add_argument('position', type=int, location='json')
    parser.add_argument('progress', type=int, location='json')
    parser.add_argument('isPublic', type=bool, location='json')
    update = parser.parse_args()

    Recording.objects(Q(id=quip_id)).modify(
        upsert=True,
        set__isPublic=update['isPublic']
    )

    Listen.objects(Q(user=g.user['id']) & Q(recording=quip_id)).modify(
        upsert=True,
        set__progress=update['progress'],
        set__position=update['position'],
        set__duration=update['duration'],
    )

    return QuipMapper.to_web_dto(Recording.objects.get_or_404(Q(id=quip_id))), 200


@requires_auth
@bp.route('/api/quips/<string:quip_id>', methods=['DELETE'])
def delete_recording(quip_id):
    record = Recording.objects.get_or_404(Q(id=quip_id))
    if not record or not record.isPublic or record.user.id != g.user['id']:
        return {}, 404

    record.delete()

    return {}, 204


@bp.route('/api/quips', methods=['GET'])
def get_list_all_recordings():
    entities = Recording.objects(Q(isPublic=True))[:50].order_by('-postedAt')
    return map(QuipMapper.to_web_dto, entities)


@requires_auth
@bp.route('/api/quips', methods=['POST'])
def save_new_recording():
    parser = reqparse.RequestParser()
    parser.add_argument('audio-blob', type=FileStorage, location='files')
    parser.add_argument('description')
    form = parser.parse_args()

    file = form['audio-blob']
    current_app.logger.debug("file: '%s' type: '%s'" % (file.filename, file.content_type))

    if file and file.content_type == 'audio/ogg':
        user = User.objects.get(id=g.user['id'])

        recording = Recording()
        recording.description = form['description']
        recording.isPublic = True
        recording.user = user
        recording.save()

        recording_id = str(recording.id)
        recording_path = os.path.join(current_app.config['RECORDINGS_PATH'], recording_id + '.ogg')
        current_app.logger.debug('saving recording to: ' + recording_path)
        file.save(recording_path)

        tiny_id = tinyurl.encode(str(recording_id))

        url = url_for('spa_web.single_recording', recording_id=tiny_id)
        return {'status': 'success', 'url': url}

    # else file upload failed, show an error page
    return {'status': 'failed'}


@bp.route('/api/u/<string:user_id>/quips')
def get_list_of_user_recordings(user_id):
    dbref_user_id = User.objects.get(username=user_id)

    entities = Recording.objects(Q(isPublic=True) & Q(user=dbref_user_id))[:50].order_by('-postedAt')
    return map(QuipMapper.to_web_dto, entities)


@bp.route('/api/listen/<string:user_id>/<string:recording_id>')
def get_user_recording_listen_status(user_id, recording_id):
    try:
        status = Listen.objects.get(Q(user=user_id) & Q(recording=recording_id))
    except Listen.DoesNotExist:
        status = Listen(user=user_id, recording=recording_id, progress=0)
    return status


@requires_auth
@bp.route('/api/recording/publish/<string:recording_id>', methods=['POST'])
def toggle_recording_visibility(recording_id):
    """Toggle private/public bit on recording. Must only work on a recording caller owns"""

    try:
        is_public = request.form['isPublic']
        print "Making recording: %s public: %s" % (recording_id, is_public)
        recording = Recording.objects.get(id=recording_id, user=g.user['id'])
        recording.isPublic = is_public == 'true'
        recording.save()
        return {'status': 'success'}, 200
    except Exception as err:
        print "Error while toggling isPublic:"
        print err
        return {'status': 'failed', 'error': err.message}, 500
