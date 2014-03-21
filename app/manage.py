from mongoengine import *
from datetime import datetime
from bson.dbref import DBRef
import optparse

def process_args(option, opt, value, parser):
    return

def update_db():

    connect("quips")

    class User(Document):
        username = StringField()
        createdAt = DateTimeField(default=datetime.now)
        oauthToken = StringField()
        oauthTokenSecret = StringField()

    class Recording(Document):
        meta = {'collection': 'recordings'}
        description = StringField(required=False)
        isPublic = BooleanField(required=True)
        postedAt = DateTimeField(default=datetime.now, required=True)
        user = ReferenceField(User, required=True)

    recording = Recording.objects()

    user = User.objects(username='unbuffered')[0]

    for record in recording:
        record.user = DBRef('user', user.id)
        if not record.description:
            print "> found record with no description: [%s]" % record.description
            record.description = ""

        record.user = user
        record.save()

if __name__ == '__main__':
    parser = optparse.OptionParser(usage='usage: %prog [options]')

    # callback action is for argument filtering
    #parser.add_option('-u', '--update', action='callback', callback=process_args, help='update database')
    parser.add_option('-u', '--update', action='store_true', dest='update', help='update database')

    opts, args = parser.parse_args()

    if opts.update == True:
        update_db()