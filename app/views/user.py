from datetime import datetime
from flask import render_template, g, Blueprint
from models import Recording, User

bp = Blueprint('user', __name__, template_folder='templates')

@bp.route('/u/<username>')
def user_recordings(username):
    # TODO: boo, get_or_create() is deprecated. need another one-liner
    user, user_not_found = User.objects.get_or_create(username=username, auto_save=False)

    if user_not_found:
        # TODO: create a user-not-found page
        print "warning: user not found!"
        return

    recordings = Recording.objects(user = user).order_by('-postedAt')

    for record in recordings:
        # create timestamp for javascript's vague-time lib
        record.timestamp = record.postedAt.isoformat()

        # replace empty descriptions with something
        # TODO: do this client-side
        if not record.description:
            record.description = "N/A"

    return render_template(
        'user_recordings.html', recordings=recordings, user=g.user
    )

@bp.route('/u/<username>/<recordingId>')
def user_one_recording(username, recordingId):
    
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