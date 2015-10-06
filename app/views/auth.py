import urllib

from flask import redirect, url_for, request, flash, session, Blueprint
from mongoengine import DoesNotExist
from twython import Twython
from app.models import User
from app import webapp, TWITTER_KEY, TWITTER_SECRET
import os

bp = Blueprint('auth', __name__, template_folder='templates')


def destroy_session():
    session.pop('oauth_token', None)
    session.pop('oauth_token_secret', None)
    session.pop('userId', None)


@bp.route('/logout')
def auth_logout():
    destroy_session()

    # TODO: is there a better way to unset cookies in Flask?
    response = webapp.make_response(redirect(url_for('homepage.index')))
    # response.set_cookie('aid', '', expires=0)
    return response


@bp.route('/auth')
def auth_login():
    destroy_session()

    twitter = Twython(TWITTER_KEY, TWITTER_SECRET)

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
    raw_id = str(user.id)
    img_filename = user_info['profile_image_url'].split('/')[-1]
    img_path_relative = '/%s/%s' % (raw_id, img_filename)
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
        destroy_session()  # destroy session, getting rid of all temp oauth keys
        return redirect(next_url)

    # erase temp oauth-tokens
    session.pop('oauth_token', None)
    session.pop('oauth_token_secret', None)

    try:
        user = User.objects.get(username=final['screen_name'])
    except DoesNotExist:
        user = User(username=final['screen_name'])

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

    # make a permanent 1-year cookie for a successful login
    session['userId'] = str(user.id)
    session.permanent = True

    # expire in a year, don't expose to javascript
    # response.set_cookie('aid', cookieId, expires=time.time() + 360 * 24 * 3600, httponly=True)

    return response
