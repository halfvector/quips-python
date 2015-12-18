from app import tinyurl
from flask import render_template, g, Blueprint, url_for
from mongoengine import Q, DoesNotExist
from ..models import Recording, User

bp = Blueprint('user', __name__, template_folder='templates')


@bp.route('/u/<username>')
def user_recordings(username):
    return render_template(
        'homepage.html',
        user=g.user
    )

@bp.route('/listen/<recordingId>')
def one_recording(recordingId):
    recordingId = tinyurl.decode(recordingId)

    try:
        record = Recording.objects.get(id=recordingId)

        # either recording is public or its private and we are the owners
        if not record.isPublic and record.user.id != g.user['id']:
            # not allowed to see this recording
            return render_template('user_recording_not_found.html', user=g.user)

    except Exception, err:
        print "Error grabbing recording: %s" % err
        return render_template('user_recording_not_found.html', user=g.user)

    # create timestamp for javascript's vague-time lib
    record.timestamp = record.postedAt.isoformat()

    tinyId = tinyurl.encode(str(record.id))
    record.publicUrl = url_for('user.one_recording', recordingId=tinyId)
    record.isMine = record.user.id == g.user['id']

    # replace empty descriptions with something
    # TODO: do this client-side
    if not record.description:
        record.description = "(No Text)"

    return render_template('user_one_recording.html', post=record, user=g.user)


@bp.route('/u/<username>/<recordingId>')
def user_one_recording(username, recordingId):
    recordingId = tinyurl.decode(recordingId)
    print "recordingId: " + recordingId

    record = Recording.objects.get(id=recordingId)

    # create timestamp for javascript's vague-time lib
    record.timestamp = record.postedAt.isoformat()

    # replace empty descriptions with something
    # TODO: do this client-side
    if not record.description:
        record.description = "N/A"

    return render_template(
        'user_one_recording.html', post=record, user=g.user
    )
