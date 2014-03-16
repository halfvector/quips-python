from bson.objectid import ObjectId
from flask import url_for, render_template, g, session, request
from werkzeug.debug import DebuggedApplication

from app import webapp, db   # start server
import views                 # import views

#webapp.register_blueprint(views.homepage.bp)
#webapp.register_blueprint(views.recordings.bp)
#webapp.register_blueprint(views.auth.bp)
#webapp.register_blueprint(views.user.bp)

from models import Recording, User

# before processing a request, try to pull in the user session
@webapp.before_request
def before_request():
    g.user = None
    global webapp

    # check if session is valid
    if 'authenticated' in session and 'username' in session and 'aid' in session:
        webapp.logger.debug("user has active session and is authenticated: " + session['username'])
        g.user = {
            'username': session['username'],
            'authenticated': session['authenticated'],
        }
        return

    # if session doesn't already contain useful data
    # attempt to use cookie to rebuild session
    webapp.logger.debug("attempting session restore from cookie")

    if 'aid' in request.cookies:
        try:
            aid = request.cookies.get('aid')
            user = User.objects.get(id=ObjectId(aid))

        except:
            user = None
            views.auth.destroy_session()

        if user is not None:
            # save session data so we don't have to go manually fishing it out of db next time around
            session['username'] = user.username
            session['aid'] = str(user.id)
            session['oauth'] = (user.oauthToken, user.oauthTokenSecret)
            session['authenticated'] = True
        else:
            session['username'] = ''
            session['authenticated'] = False

        g.user = {
            'username': session['username'],
            'authenticated': session['authenticated'],
        }

        webapp.logger.debug("session['username'] = " + g.user['username'])

        webapp.logger.debug("user session recreated using cookie.aid for user:" + g.user['username'])
        return

    # we don't have any long-term cookies, user is anonymous
    webapp.logger.debug("user session is anonymous")

# wrap flask wsgi entry-point with a browser-based debugger
debugapp = DebuggedApplication(webapp, evalex=True)

if __name__ == '__main__':
    webapp.run(host='0.0.0.0')