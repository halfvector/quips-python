from flask import redirect, url_for, request, flash, session, g
import time

from bootstrap import app
from models import User
from twython import Twython

def destroy_session():
    session.pop('authenticated', None)
    session.pop('oauth', None)
    session.pop('username', None)
    session.pop('aid', None)


@app.route('/auth')
def auth_login():
    destroy_session()
    #return twitter.authorize(callback=url_for('auth_authorized',next=request.args.get('next') or request.referrer or None))
    twitter = Twython('3v4UIfTkiYRq1xaH6suZKA','Ftb9ffIAccJPXULkpNo66c9FGJUohRRO027twv4Oc')

    #url = url_for('auth_authorized', _external=True, next=request.args.get('next') or request.referrer or None)
    url = "http://audio.dev.bugvote.com/auth-response"
    app.logger.debug("url: " + url)

    auth = twitter.get_authentication_tokens(url)

    app.logger.debug(auth['oauth_token'])
    app.logger.debug(auth['oauth_token_secret'])
    app.logger.debug(auth['auth_url'])

    session['oauth_token'] = auth['oauth_token']
    session['oauth_token_secret'] = auth['oauth_token_secret']

    return redirect(auth['auth_url'])

@app.route('/logout')
def auth_logout():
    destroy_session()
    response = app.make_response(redirect(url_for('HomepageView:index')))
    response.set_cookie('aid', '', expires=0)
    return response

#@twitter.authorized_handler
@app.route('/auth-response')
def auth_authorized():
    next_url = request.args.get('next') or url_for('HomepageView:index')

    try:
        app.logger.debug("oauth_verifier: " + request.args.get('oauth_verifier'))
        twitter = Twython('3v4UIfTkiYRq1xaH6suZKA', 'Ftb9ffIAccJPXULkpNo66c9FGJUohRRO027twv4Oc', session['oauth_token'], session['oauth_token_secret'])
        final = twitter.get_authorized_tokens(request.args.get('oauth_verifier'))
        app.logger.debug('final oauth: ' + final['oauth_token'] + ' ' + final['oauth_token_secret'])
    except:
        final = None


    if final is None:
        flash(u'Did not sign in')
        return redirect(next_url)

    session['oauth'] = (final['oauth_token'], final['oauth_token_secret'])
    session['username'] = final['screen_name']
    session['authenticated'] = True

    try:
        # grab user from db if possible
        user = User.objects.get(username = final['screen_name'])
    except:
        # else create a new one
        user = User()
        user.username = final['screen_name']

    # update tokens and save to db
    user.oauthToken = final['oauth_token']
    user.oauthTokenSecret = final['oauth_token_secret']
    user.save()

    flash('You signed in as %s' % final['screen_name'])

    # set a cookie client-side with which we can locate this session
    response = app.make_response(redirect(next_url))

    rawId = str(user.id)
    session['aid'] = rawId
    response.set_cookie('aid', rawId, expires=time.time() + 360 * 24 * 3600, httponly=True)

    return response
