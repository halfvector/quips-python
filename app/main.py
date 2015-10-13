import hashlib
import uuid
from app.auth import load_current_user
from bson.objectid import ObjectId
from flask import g, session, request, url_for, redirect, current_app, send_from_directory
from mongoengine.queryset import DoesNotExist
from .views import homepage, recordings, auth, user, changelog  # import views
from .models import User

import config
from services import app

# hookup error handling
from raven.contrib.flask import Sentry

sentry = Sentry(app, dsn=config.SENTRY_DSN)

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


# after app.py configures everything, we can spawn a standalone (non-wsgi) server here
# handy for quick debugging
if __name__ == '__main__' or True:
    from werkzeug.serving import run_simple

    run_simple('0.0.0.0', 5000, app, use_reloader=False, use_debugger=True, use_evalex=True)
