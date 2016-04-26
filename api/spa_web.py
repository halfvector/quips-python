from flask import redirect, render_template, g, Blueprint, session, send_from_directory, current_app

bp = Blueprint('spa_web', __name__, template_folder='templates')


# catch-all route, serve static files
@bp.route('/', defaults={'path': ''})
@bp.route('/<path:path>')
def index(path):
    # if user not logged in, show login page
    if 'userId' not in session or not hasattr(g, 'user'):
        current_app.logger.info("homepage.index(); user not logged in, showing landing login page..")
        return redirect("/welcome", code=302)

    return send_from_directory(current_app.config['PATH_PUBLIC'], 'layout.html')


@bp.route('/welcome')
def show_login():
    return send_from_directory(current_app.config['PATH_PUBLIC'], 'landing.html')


@bp.route('/changelog')
def show_changelog():
    return send_from_directory(current_app.config['PATH_PUBLIC'], 'layout.html')


@bp.route('/record')
def show_recorder():
    return send_from_directory(current_app.config['PATH_PUBLIC'], 'layout.html')


@bp.route('/u/<username>/<recording_id>')
def user_one_recording(username, recording_id):
    return send_from_directory(current_app.config['PATH_PUBLIC'], 'layout.html')


@bp.route('/q/<recording_id>')
def single_recording(recording_id):
    return send_from_directory(current_app.config['PATH_PUBLIC'], 'layout.html')


@bp.route('/u/<username>')
def user_recordings(username):
    return send_from_directory(current_app.config['PATH_PUBLIC'], 'layout.html')


@bp.route('/s/<stream_id>')
def single_stream(stream_id):
    return send_from_directory(current_app.config['PATH_PUBLIC'], 'layout.html')
