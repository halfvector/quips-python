from datetime import datetime
from bootstrap import db

class User(db.Document):
    meta = {'collection': 'users'}
    fullName = db.StringField(required=True, max_length=32)
    nickName = db.StringField(required=True, max_length=16)
    authProvider = db.StringField()
    authId = db.StringField()

class Recording(db.Document):
    meta = {'collection': 'recordings'}
    description = db.StringField()
    isPublic = db.BooleanField()
    postedAt = db.DateTimeField(default=datetime.now)
    user = db.ReferenceField(User)

class User(db.Document):
    username = db.StringField()
    createdAt = db.DateTimeField(default=datetime.now)
    oauthToken = db.StringField()
    oauthTokenSecret = db.StringField()

