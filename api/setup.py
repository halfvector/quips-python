from flask import request, send_from_directory

import auth_api
import spa_api
import spa_web
from auth import load_current_user
from services import app

# register individual pages
app.register_blueprint(spa_web.bp)
app.register_blueprint(auth_api.bp)
app.register_blueprint(spa_api.bp)


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
