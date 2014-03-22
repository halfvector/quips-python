from bson.objectid import ObjectId
from flask import url_for, render_template, g, session, request

from app import webapp, db   # start server
import views                 # import views

#from app import webapp, db
from views import homepage, recordings, auth, user

webapp.register_blueprint(homepage.bp)
webapp.register_blueprint(recordings.bp)
webapp.register_blueprint(auth.bp)
webapp.register_blueprint(user.bp)

from models import Recording, User

def load_user_commons():
    user = None
    if 'aid' in request.cookies:
        try:
            aid = request.cookies.get('aid')
            user = User.objects.get(id=aid)

            if not 'aid' in session:
                session['aid'] = aid

        except:
            user = None
            views.auth.destroy_session()

    if user is not None:
        # save session data so we don't have to go manually fishing it out of db next time around
        g.user = {
            'username': user.username,
            'authenticated': True,
            'profileImage': user.profileImage,
            'oauth': (user.oauthToken, user.oauthTokenSecret)
        }

        webapp.logger.debug("user session recreated using cookie.aid for user:" + g.user['username'])
    else:
        g.user = {
            'username': '',
            'authenticated': False,
            'profileImage': '',
        }

        webapp.logger.debug("user session is anonymous")

# before processing a request, try to pull in the user session data
@webapp.before_request
def before_request():
    g.user = None
    load_user_commons()


# standalone server
if __name__ == '__main__':
    from werkzeug.debug import DebuggedApplication
    from flask.ext.debugtoolbar import DebugToolbarExtension

    #toolbar = DebugToolbarExtension(webapp)
    debugapp = DebuggedApplication(webapp, evalex=True) # wrap flask wsgi entry-point with a browser-based debugger
    webapp.run(host='0.0.0.0')