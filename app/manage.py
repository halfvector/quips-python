# helper script for production boxes
# for doing repairs, backups, etc

import os
import bson
from twython import Twython
import urllib
import optparse

from app import webapp, TWITTER_KEY, TWITTER_SECRET
from models import *


def process_args(option, opt, value, parser):
    return

def repair_user_references():
    user = User.objects()[0]
    print 'user: ' + user.username
    recordings = Recording.objects()

    for record in recordings:
        user = record.user
        webapp.logger.debug('user: %s' % user.username)
        userref = User.objects(id = bson.objectid.ObjectId(user.id))[0]
        webapp.logger.debug('  ref: %s', userref)
        record.user = None
        record.user = userref
        record.save()

def update_profile_images():
    users = User.objects()

    for user in users:
        webapp.logger.debug('looking up user: %s' % user.username)
        twitter = Twython(TWITTER_KEY, TWITTER_SECRET, user.oauthToken, user.oauthTokenSecret)
        user_info = twitter.show_user(screen_name=user.username)
        webapp.logger.debug('  user "%s" profile img: %s' % (user.username, user_info['profile_image_url']))

        # figure out paths to store the image, using the filename and extension provided by twitter
        rawId = str(user.id)
        img_filename = user_info['profile_image_url'].split('/')[-1]
        img_path_relative = '/%s/%s' % (rawId, img_filename)
        img_path_absolute = webapp.config['PATH_USER_PROFILE_IMAGE'] + img_path_relative

        # ensure parent folder exists
        img_parent_dir = os.path.dirname(img_path_absolute)
        if not os.path.isdir(img_parent_dir): os.makedirs(img_parent_dir)

        # download image
        webapp.logger.debug('  downloading profile image to %s' % img_path_absolute)
        urllib.urlretrieve(user_info['profile_image_url'], img_path_absolute)

        # save changes to user
        user.profileImage = img_path_relative
        user.save()

if __name__ == '__main__':
    parser = optparse.OptionParser(usage='usage: %prog [options]')
    parser.add_option('-u', '--update', action='store_true', dest='update', help='update database')

    opts, args = parser.parse_args()

    if opts.update == True:
        update_profile_images()