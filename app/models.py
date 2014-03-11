from datetime import datetime
from bootstrap import db

class OldUser(db.Document):
    meta = {'collection': 'users'}
    fullName = db.StringField(required=True, max_length=32)
    nickName = db.StringField(required=True, max_length=16)
    authProvider = db.StringField()
    authId = db.StringField()

class User(db.Document):
    username = db.StringField()
    createdAt = db.DateTimeField(default=datetime.now)
    oauthToken = db.StringField()
    oauthTokenSecret = db.StringField()

class Recording(db.Document):
    meta = {'collection': 'recordings'}
    description = db.StringField(required=True)
    isPublic = db.BooleanField(required=True)
    postedAt = db.DateTimeField(default=datetime.now, required=True)
    user = db.ReferenceField(User, required=True)


