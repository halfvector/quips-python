import hashlib
import uuid

from api import auth_api
from models import User
from services import app
from bson import ObjectId
from flask import session, current_app, request, url_for, redirect, g
from mongoengine import DoesNotExist


def generate_csrf(input):
    salt = uuid.uuid4().hex
    return hashlib.sha256(salt.encode() + input.encode()).hexdigest(), salt


def load_current_user():
    user = None
    session.permanent = True

    secured_endpoints = ('homepage.index', 'recordings.', 'user.')

    current_app.logger.info("load_current_user(); request.endpoint = %s" % request.endpoint)

    # skip not-authed redirect check when already on landing page
    if (request.endpoint is not None) and ('homepage.index' not in request.endpoint):
        # if user not-authed, redirect
        if ('userId' not in session) and any(endpoint in request.endpoint for endpoint in secured_endpoints):
            print "redirecting due to missing userId for endpoint: " + request.endpoint
            return redirect(url_for('homepage.index'))

    # load User from raw User.id
    if 'userId' in session and ObjectId.is_valid(session.get('userId')):
        try:
            user = User.objects.get(id=session.get('userId'))
        except DoesNotExist:
            user = None

        if user is None:
            # user not found, clear out session, possibly destroy cookie (user was deleted? user guessing ids?)
            auth_api.destroy_session()

    # create user-data that can be seen by any module/page on the site
    if user is not None:
        g.user = {
            'username': user.username,
            'authenticated': True,
            'profileImage': user.profileImage,
            'oauth': (user.oauthToken, user.oauthTokenSecret),
            'id': user.id
        }

        app.logger.debug("user session: " + g.user['username'])
    else:
        # anonymous user!
        g.user = {
            'username': '',
            'authenticated': False,
            'profileImage': '',
            'id': False
        }

        app.logger.debug("user session is anonymous")
