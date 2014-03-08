from bson.objectid import ObjectId
from flask import url_for, render_template, g, session, request
from models import Recording, User

from bootstrap import app, db
from views import homepage, recordings, auth

from views.auth import destroy_session

#with app.test_request_context():
#    print url_for('HomepageView:index')
    #print url_for('homepage')
    #print url_for('my_profile')
    #print url_for('show_user_profile', username='unbuffered')

# before processing a request, try to pull in the user session
@app.before_request
def before_request():
    g.user = None

    # check if session is valid
    if 'authenticated' in session and 'username' in session and 'aid' in session:
        app.logger.debug("user has active session and is authenticated: " + session['username'])
        g.user = {
            'username': session['username'],
            'authenticated': session['authenticated'],
        }
        return

    # if session doesn't already contain useful data
    # attempt to use cookie to rebuild session
    app.logger.debug("attempting session restore from cookie")

    if 'aid' in request.cookies:
        try:
            aid = request.cookies.get('aid')
            user = User.objects.get(id=ObjectId(aid))

        except:
            user = None
            destroy_session()

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

        app.logger.debug("session['username'] = " + g.user['username'])

        app.logger.debug("user session recreated using cookie.aid for user:" + g.user['username'])
        return

    # we don't have any long-term cookies, user is anonymous
    app.logger.debug("user session is anonymous")

if __name__ == '__main__':
    app.run(host='0.0.0.0')