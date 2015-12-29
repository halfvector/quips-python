from datetime import datetime

from services import db


class User(db.Document):
    username = db.StringField(required=True)
    createdAt = db.DateTimeField(default=datetime.now)
    oauthToken = db.StringField()
    oauthTokenSecret = db.StringField()
    profileImage = db.StringField()


class Recording(db.Document):
    meta = {'collection': 'recordings'}
    description = db.StringField(required=True)
    isPublic = db.BooleanField(required=True)
    postedAt = db.DateTimeField(default=datetime.now, required=True)
    user = db.ReferenceField(User, required=True, dbref=False)
    duration = db.IntField # duration in seconds


class Listen(db.Document):
    user = db.ReferenceField(User, required=True)
    recording = db.ReferenceField(Recording, required=True)
    position = db.IntField(required=True) # position within recording in seconds
    duration = db.IntField(required=True) # seconds
    progress = db.IntField(required=True) # %
