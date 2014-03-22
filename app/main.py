from bson.objectid import ObjectId
from flask import url_for, render_template, g, session, request
import hashlib
import uuid

from app import webapp, db   # start server
from views import homepage, recordings, auth, user  # import views

# register individual pages
webapp.register_blueprint(homepage.bp)
webapp.register_blueprint(recordings.bp)
webapp.register_blueprint(auth.bp)
webapp.register_blueprint(user.bp)

from models import Recording, User

# before processing a request, try to pull in the user session data
@webapp.before_request
def before_request():
    # load user data
    load_current_user()

    # TODO: generate csrf
    #

def generate_csrf(input):
    salt = uuid.uuid4().hex
    return (hashlib.sha256(salt.encode() + input.encode()).hexdigest(), salt)

def load_current_user():
    user = None
    session.permanent = True

    # load User from raw User.id
    if 'userId' in session and ObjectId.is_valid(session.get('userId')):
        user, user_not_found = User.objects.get_or_create(id = ObjectId(session.get('userId')), auto_save=False)

        if user_not_found:
            # user not found, clear out session, possibly destroy cookie (user was deleted? user guessing ids?)
            auth.destroy_session()

    # create user-data that can be seen by any module/page on the site
    if user is not None:
        g.user = {
            'username': user.username,
            'authenticated': True,
            'profileImage': user.profileImage,
            'oauth': (user.oauthToken, user.oauthTokenSecret)
        }

        webapp.logger.debug("user session: " + g.user['username'])
    else:
        # anonymous user!
        g.user = {
            'username': '',
            'authenticated': False,
            'profileImage': '',
        }

        webapp.logger.debug("user session is anonymous")

# after app.py configures everything, we can spawn a standalone (non-wsgi) server here
# handy for quick debugging
if __name__ == '__main__':
    from werkzeug.debug import DebuggedApplication
    from flask.ext.debugtoolbar import DebugToolbarExtension

    #toolbar = DebugToolbarExtension(webapp) # a little toolbar which exposes sensitive information
    debugapp = DebuggedApplication(webapp, evalex=True) # wrap flask wsgi entry-point with a browser-based debugger
    webapp.run(host='0.0.0.0')