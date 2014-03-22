from datetime import datetime
from app import db

class User(db.Document):
    username = db.StringField()
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
