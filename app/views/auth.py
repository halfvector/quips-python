from flask import redirect, url_for, request, flash, session, g, Blueprint
import hashlib
from twython import Twython
import time, os, urllib
import uuid

from models import User
from app import webapp,TWITTER_KEY, TWITTER_SECRET

bp = Blueprint('auth', __name__, template_folder='templates')

def destroy_session():
    session.pop('oauth_token', None)
    session.pop('oauth_token_secret', None)
    session.pop('aid', None)

@bp.route('/logout')
def auth_logout():
    destroy_session()

    # TODO: is there a better way to unset cookies in Flask?
    response = webapp.make_response(redirect(url_for('homepage.index')))
    response.set_cookie('aid', '', expires=0)
    return response

@bp.route('/auth')
def auth_login():
    destroy_session()

    twitter = Twython(TWITTER_KEY, TWITTER_SECRET)

    #callback_url = url_for('auth.auth_authorized', _external=True, next=request.args.get('next') or request.referrer or None)
    callback_url = url_for('auth.auth_authorized', _external=True)

    auth = twitter.get_authentication_tokens(callback_url)

    # store temporary oauth-tokens, until twitter redirects back to our callback_url
    session['oauth_token'] = auth['oauth_token']
    session['oauth_token_secret'] = auth['oauth_token_secret']

    return redirect(auth['auth_url'])


def download_user_profile_image(twitter, user):
    user_info = twitter.show_user(screen_name=user.username)
    webapp.logger.debug('user "%s" profile img: %s' % (user.username, user_info['profile_image_url']))

    # figure out paths to store the image, using the filename and extension provided by twitter
    rawId = str(user.id)
    img_filename = user_info['profile_image_url'].split('/')[-1]
    img_path_relative = '/%s/%s' % (rawId, img_filename)
    img_path_absolute = webapp.config['PATH_USER_PROFILE_IMAGE'] + img_path_relative

    # ensure parent folder exists
    img_parent_dir = os.path.dirname(img_path_absolute)
    if not os.path.isdir(img_parent_dir): os.makedirs(img_parent_dir)

    # download image
    webapp.logger.debug('downloading profile image to %s' % img_path_absolute)
    urllib.urlretrieve(user_info['profile_image_url'], img_path_absolute)

    # update user data, do not save yet
    user.profileImage = img_path_relative

@bp.route('/auth-response')
def auth_authorized():
    next_url = request.args.get('next') or url_for('homepage.index')

    # use temporarily oauth-tokens from session to finish authentication
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

    # erase temp oauth-tokens
    session.pop('oauth_token', None)
    session.pop('oauth_token_secret', None)

    user, user_not_found = User.objects.get_or_create(username = final['screen_name'], auto_save=False)

    # if we have a new user, populate the basic info
    if user_not_found:
        user.username = final['screen_name']

    # recreate twitter-api interface using final oauth-tokens
    twitter = Twython(TWITTER_KEY, TWITTER_SECRET, final['oauth_token'], final['oauth_token_secret'])

    # whenever user performs a full login, we refresh their profile-image
    # grab twitter avatar image, updates user but doesn't save
    download_user_profile_image(twitter, user)

    # update oauth-tokens and save to db
    user.oauthToken = final['oauth_token']
    user.oauthTokenSecret = final['oauth_token_secret']
    user.save()

    # show an annoying alert :)
    flash('%s is in the house!' % final['screen_name'], 'info')

    # set a cookie client-side with which we can locate this session
    response = webapp.make_response(redirect(next_url))

    # 'save this browser' for the user
    # for now this makes a permanent 1-year old cookie for everyone
    # TODO: facebook style per-browser identification - allow user to manage sessions from other devices (eg: accidentally left open at the library)
    # SECURITY: change permanent session to 'opt-in'
    rawId = str(user.id)
    session['userId'] = rawId
    session.permanent = True

    # expire in a year, don't expose to javascript
    #response.set_cookie('aid', cookieId, expires=time.time() + 360 * 24 * 3600, httponly=True)

    return response
