# helper script for production boxes
# for doing repairs, backups, etc

from mongoengine import *
from datetime import datetime
from bson.dbref import DBRef
import os
import bson
from twython import Twython
import urllib
from __builtin__ import type

from app import webapp, TWITTER_KEY, TWITTER_SECRET
from models import *
import optparse

def process_args(option, opt, value, parser):
    return

def update_db():
    user = User.objects()[0]
    print 'user: ' + user.username
    recordings = Recording.objects() #.filter(Q(user=user))

    for record in recordings:
        user = record.user
        print record.description
        userref = User.objects(id = bson.objectid.ObjectId(user.id))[0]
        print userref
        record.user = None
        record.user = userref
        record.save()

def update_profile_images():
    users = User.objects()

    for user in users:
        twitter = Twython(TWITTER_KEY, TWITTER_SECRET, user.oauthToken, user.oauthTokenSecret)
        user_info = twitter.show_user(screen_name=user.username)
        print 'user "%s" profile img: %s' % (user.username, user_info['profile_image_url'])

        rawId = str(user.id)
        user_profile_image_filename = user_info['profile_image_url'].split('/')[-1]

        user.profileImage = '/%s/%s' % (rawId, user_profile_image_filename)
        user.save()

        user_profile_image_path = webapp.config['PATH_USER_PROFILE_IMAGE'] + '/%s/' % rawId
        if not os.path.isdir(user_profile_image_path):
            os.makedirs(user_profile_image_path)
        user_profile_image_path = webapp.config['PATH_USER_PROFILE_IMAGE'] + user.profileImage
        webapp.logger.debug("downloading %s to %s" % (user_info['profile_image_url'], user_profile_image_path))
        urllib.urlretrieve(user_info['profile_image_url'], user_profile_image_path)

if __name__ == '__main__':
    parser = optparse.OptionParser(usage='usage: %prog [options]')

    # callback action is for argument filtering
    #parser.add_option('-u', '--update', action='callback', callback=process_args, help='update database')
    parser.add_option('-u', '--update', action='store_true', dest='update', help='update database')

    opts, args = parser.parse_args()

    if opts.update == True:
        update_db()