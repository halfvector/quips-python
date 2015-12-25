from flask import render_template, g, Blueprint, session, send_from_directory, current_app

bp = Blueprint('spa_web', __name__, template_folder='templates')


@bp.route('/')
def index():
    # if user not logged in, show login page
    if 'userId' not in session or not hasattr(g, 'user'):
        current_app.logger.info("homepage.index(); user not logged in, showing landing login page..")
        return send_from_directory(current_app.config['PATH_PUBLIC'], 'landing.html')

    # return send_from_directory(app.config['PATH_PUBLIC'], 'homepage.html')

    return render_template(
        'layout.html',
        user=g.user
    )


@bp.route('/changelog')
def show_changelog():
    return render_template('layout.html', user=g.user)


@bp.route('/record')
def show_recorder():
    return render_template('layout.html', user=g.user)


@bp.route('/u/<username>/<recordingId>')
def user_one_recording(username, recordingId):
    return render_template('layout.html', user=g.user)


@bp.route('/q/<recordingId>')
def single_recording(recordingId):
    return render_template('layout.html', user=g.user)


@bp.route('/u/<username>')
def user_recordings(username):
    return render_template('layout.html', user=g.user)
