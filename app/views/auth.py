from flask import redirect, url_for, request, flash, session, g, Blueprint
from twython import Twython
import time, os, urllib

from models import User
from app import webapp,TWITTER_KEY, TWITTER_SECRET

bp = Blueprint('auth', __name__, template_folder='templates')

def destroy_session():
    session.pop('authenticated', None)
    session.pop('oauth', None)
    session.pop('username', None)
    session.pop('aid', None)

@bp.route('/auth')
def auth_login():
    destroy_session()

    twitter = Twython(TWITTER_KEY, TWITTER_SECRET)

    #url = url_for('auth.auth_authorized', _external=True, next=request.args.get('next') or request.referrer or None)
    callback_url = url_for('auth.auth_authorized', _external=True)
    webapp.logger.debug("twitter auth callback url: " + callback_url)

    auth = twitter.get_authentication_tokens(callback_url)

    webapp.logger.debug(auth['oauth_token'])
    webapp.logger.debug(auth['oauth_token_secret'])
    #webapp.logger.debug(auth['auth_url'])

    session['oauth_token'] = auth['oauth_token']
    session['oauth_token_secret'] = auth['oauth_token_secret']


    return redirect(auth['auth_url'])

@bp.route('/logout')
def auth_logout():
    destroy_session()
    response = webapp.make_response(redirect(url_for('homepage.index')))

    response.set_cookie('aid', '', expires=0)
    return response

#@twitter.authorized_handler
@bp.route('/auth-response')
def auth_authorized():
    next_url = request.args.get('next') or url_for('homepage.index')

    #webapp.logger.debug('oauth_token: ' + session['oauth_token'])
    #webapp.logger.debug('oauth_token_secret: ' + session['oauth_token_secret'])
    #webapp.logger.debug('oauth_verifier: ' + request.args.get('oauth_verifier'))

    # use temporarily stored oauth keys from session to finish authentication
    try:
        twitter = Twython(TWITTER_KEY, TWITTER_SECRET, session['oauth_token'], session['oauth_token_secret'])
        final = twitter.get_authorized_tokens(request.args.get('oauth_verifier'))

    except Exception as exception:
        webapp.logger.exception(exception)
        final = None

    if final is None:
        flash('Could not sign in')
        destroy_session() # destroy session, getting rid of all temp oauth keys
        return redirect(next_url)

    # recreate twitter lib with final oauth keys
    twitter = Twython(TWITTER_KEY, TWITTER_SECRET, final['oauth_token'], final['oauth_token_secret'])
    user_info = twitter.show_user(screen_name = final['screen_name'])

    # shouldn't happen, but a sanity-check anyway
    if not os.path.exists(webapp.config['PATH_USER_PROFILE_IMAGE']):
        webapp.logger.debug('WARNING: user profile image path is missing')
        flash('Sign in error')
        destroy_session()
        return redirect(next_url)

    # override and save the final oauth keys
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

    rawId = str(user.id)
    user_profile_image_filename = user_info['profile_image_url'].split('/')[-1]

    # update tokens and save to db
    user.oauthToken = final['oauth_token']
    user.oauthTokenSecret = final['oauth_token_secret']
    user.profileImage = '/%s/%s' % (rawId, user_profile_image_filename)
    user.save()

    user_profile_image_path = webapp.config['PATH_USER_PROFILE_IMAGE'] + '/%s/' % rawId
    if not os.path.isdir(user_profile_image_path):
        os.makedirs(user_profile_image_path, mode=775)

    user_profile_image_path = webapp.config['PATH_USER_PROFILE_IMAGE'] + user.profileImage
    webapp.logger.debug("downloading %s to %s" % (user_info['profile_image_url'], user_profile_image_path))
    #if os.path.isfile(user_profile_image_path):
    #    os.unlink(user_profile_image_path)
    urllib.urlretrieve(user_info['profile_image_url'], user_profile_image_path)

    flash('Signed in as %s' % final['screen_name'], 'info')

    # set a cookie client-side with which we can locate this session
    response = webapp.make_response(redirect(next_url))

    rawId = str(user.id)
    session['aid'] = rawId
    response.set_cookie('aid', rawId, expires=time.time() + 360 * 24 * 3600, httponly=True)

    return response
