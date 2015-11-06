from app.auth import load_current_user
from flask import request, send_from_directory
from views import homepage, recordings, auth, user, changelog  # import views

import config
from services import app

# register individual pages
app.register_blueprint(homepage.bp)
app.register_blueprint(recordings.bp)
app.register_blueprint(auth.bp)
app.register_blueprint(user.bp)
app.register_blueprint(changelog.bp)


# static file paths (when running without nginx)
@app.route('/profile_images/<path:filename>')
def profile_images(filename):
    return send_from_directory(app.config['PATH_USER_PROFILE_IMAGE'], filename)


@app.route('/assets/<path:filename>')
def assets_js(filename):
    return send_from_directory(app.config['PATH_ASSETS'], filename)


@app.route('/recordings/<path:filename>')
def audio_file(filename):
    return send_from_directory(app.config['RECORDINGS_PATH'], filename)

# before processing a request, try to pull in the user session data
@app.before_request
def before_request():
    # bypass auth checks for some static assets
    if request.endpoint is not None:
        if 'profile_images' in request.endpoint:
            return
        if 'assets_js' in request.endpoint:
            return

    # load user data
    return load_current_user()

    # TODO: generate csrf


@app.after_request
def add_header(response):
    response.headers['X-UA-Compatible'] = 'IE=Edge,chrome=1'
    response.headers['Cache-Control'] = 'public, max-age=0'
    return response
