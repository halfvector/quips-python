import flask
from app import tinyurl
from flask import render_template, g, Blueprint, url_for, session, send_from_directory, current_app
from mongoengine import Q

from ..models import Recording

bp = Blueprint('homepage', __name__, template_folder='templates')


@bp.route('/')
def index():
    # if user not logged in, show login page
    if 'userId' not in session or not hasattr(g, 'user'):
        current_app.logger.info("homepage.index(); user not logged in, showing landing login page..")
        return send_from_directory(current_app.config['PATH_PUBLIC'], 'landing.html')

    recordings = Recording.objects(Q(isPublic=True))[:50].order_by('-postedAt')

    for record in recordings:
        record.timestamp = record.postedAt.isoformat()
        record.isMine = record.user.id == g.user['id']

        tiny_id = tinyurl.encode(str(record.id))
        record.publicUrl = url_for('user.one_recording', recordingId=tiny_id)

        if not record.description:
            record.description = "(no description)"

    return render_template(
        'homepage.html',
        recordings=recordings,
        user=g.user
    )


@bp.route('/index.json')
def index_json():
    # if user not logged in, show login page
    if 'userId' not in session or not hasattr(g, 'user'):
        current_app.logger.info("homepage.index(); user not logged in, showing landing login page..")
        return send_from_directory(current_app.config['PATH_PUBLIC'], 'landing.html')

    recordings = Recording.objects(Q(isPublic=True))[:50].order_by('-postedAt')

    for record in recordings:
        record.timestamp = record.postedAt.isoformat()
        record.isMine = record.user.id == g.user['id']

        tiny_id = tinyurl.encode(str(record.id))
        record.publicUrl = url_for('user.one_recording', recordingId=tiny_id)

        if not record.description:
            record.description = "(no description)"

    return flask.jsonify(recordings = recordings.to_json())
