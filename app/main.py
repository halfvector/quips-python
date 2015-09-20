import hashlib
import uuid

from bson.objectid import ObjectId
from flask import g, session
from app import webapp  # start server
from views import homepage, recordings, auth, user  # import views
from mongoengine.queryset import DoesNotExist


# register individual pages
webapp.register_blueprint(homepage.bp)
webapp.register_blueprint(recordings.bp)
webapp.register_blueprint(auth.bp)
webapp.register_blueprint(user.bp)

from models import User

# before processing a request, try to pull in the user session data
@webapp.before_request
def before_request():
    # load user data
    load_current_user()

    # TODO: generate csrf
    #


def generate_csrf(input):
    salt = uuid.uuid4().hex
    return hashlib.sha256(salt.encode() + input.encode()).hexdigest(), salt

def load_current_user():
    user = None
    session.permanent = True

    # load User from raw User.id
    if 'userId' in session and ObjectId.is_valid(session.get('userId')):
        try:
            user = User.objects.get(id=session.get('userId'))
        except DoesNotExist:
            user = None

        if user is None:
            # user not found, clear out session, possibly destroy cookie (user was deleted? user guessing ids?)
            auth.destroy_session()

    # create user-data that can be seen by any module/page on the site
    if user is not None:
        g.user = {
            'username': user.username,
            'authenticated': True,
            'profileImage': user.profileImage,
            'oauth': (user.oauthToken, user.oauthTokenSecret),
            'id': user.id
        }

        webapp.logger.debug("user session: " + g.user['username'])
    else:
        # anonymous user!
        g.user = {
            'username': '',
            'authenticated': False,
            'profileImage': '',
            'id': False
        }

        webapp.logger.debug("user session is anonymous")

# after app.py configures everything, we can spawn a standalone (non-wsgi) server here
# handy for quick debugging
if __name__ == '__main__':
    from werkzeug.debug import DebuggedApplication

    # toolbar = DebugToolbarExtension(webapp) # a little toolbar which exposes sensitive information
    debugapp = DebuggedApplication(webapp, evalex=True)  # wrap flask wsgi entry-point with a browser-based debugger
    webapp.run(host='0.0.0.0')
