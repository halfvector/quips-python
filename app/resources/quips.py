import os

from bson import ObjectId
from flask import g, url_for, current_app
from flask.ext.restful import reqparse
from flask_restful import Resource
from mongoengine import Q
from werkzeug.datastructures import FileStorage

from app import tinyurl
from ..models import *


class QuipMapper:
    @staticmethod
    def to_web_dto(entity):
        tiny_id = tinyurl.encode(str(entity.id))

        try:
            listen = Listen.objects.get(Q(user=g.user['id']) & Q(recording=entity.id))
            progress, position, duration = listen.progress, listen.position, listen.duration
        except Listen.DoesNotExist:
            progress, position, duration = 0, 0, 0

        return {
            'timestamp': entity.postedAt.isoformat(),
            'isMine': entity.user.id == g.user['id'],
            'username': entity.user.username,
            'profileImage': entity.user.profileImage,
            'isPublic': entity.isPublic,
            'description': entity.description or "(no description)",
            'id': entity.id,
            'url': '/recordings/' + str(entity.id) + '.ogg',
            'tinyId': tiny_id,
            'publicUrl': url_for('spa_web.single_recording', recordingId=tiny_id),
            'progress': progress,
            'position': position,
            'duration': duration,
        }


class QuipResource(Resource):
    def get(self, quip_id):
        tiny_id = ObjectId(tinyurl.decode(quip_id))

        record = Recording.objects.get_or_404(Q(id=tiny_id))
        if not record or not record.isPublic or record.user.id != g.user['id']:
            return {}, 404

        return QuipMapper.to_web_dto(record)

    def put(self, quip_id):
        parser = reqparse.RequestParser()
        parser.add_argument('duration', type=int, location='json')
        parser.add_argument('position', type=int, location='json')
        parser.add_argument('progress', type=int, location='json')
        update = parser.parse_args()
        print "updating progress", update['progress']

        Listen.objects(Q(user=g.user['id']) & Q(recording=quip_id)).modify(
            upsert=True,
            set__progress=update['progress'],
            set__position=update['position'],
            set__duration=update['duration'],
        )

        return {}, 200

    def delete(self, quip_id):
        # tiny_id = ObjectId(tinyurl.decode(quip_id))

        record = Recording.objects.get_or_404(Q(id=quip_id))
        if not record or not record.isPublic or record.user.id != g.user['id']:
            return {}, 404

        record.delete()

        return {}, 204



class QuipListResource(Resource):
    def get(self):
        entities = Recording.objects(Q(isPublic=True))[:50].order_by('-postedAt')
        return map(QuipMapper.to_web_dto, entities)

    def post(self):
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

            url = url_for('spa_web.single_recording', recordingId=tiny_id)
            return {'status': 'success', 'url': url}

        # else file upload failed, show an error page
        return {'status': 'failed'}



class UserQuipListResource(Resource):
    def get(self, user_id):
        dbref_user_id = User.objects.get(username=user_id)

        entities = Recording.objects(Q(isPublic=True) & Q(user=dbref_user_id))[:50].order_by('-postedAt')
        return map(QuipMapper.to_web_dto, entities)
