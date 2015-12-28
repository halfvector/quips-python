from app.auth import load_current_user
from flask import request, send_from_directory
# import all views
from views import spa_web, auth, spa_api

# import all api resourcs
from resources import *

import config
from services import app, api

# register individual pages
app.register_blueprint(spa_web.bp)
app.register_blueprint(auth.bp)
app.register_blueprint(spa_api.bp)

# register restful api endpoints
# api.add_resource(UserResource, '/users/<string:user_id>')
# api.add_resource(UserListResource, '/users')
# api.add_resource(CurrentUserResource, '/current_user')
# api.add_resource(QuipResource, '/api/quips/<string:quip_id>')
# api.add_resource(QuipListResource, '/api/quips')
# api.add_resource(UserQuipListResource, '/api/u/<string:user_id>/quips')
# api.add_resource(ListenResource, '/listen/<string:user_id>/<string:recording_id>')
# api.add_resource(ListenListResource, '/listen')
# api.add_resource(CreateRecording, '/api/create_recording')


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
