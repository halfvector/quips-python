from flask import g, session
from flask_restful import Resource
from mongoengine import Q

from ..models import *


class CreateRecording(Resource):
    def get(self):
        user_id = session.get('userId')
        num_recordings = Recording.objects(Q(user=user_id)).count()
        return {
            'num_recordings': num_recordings,
            'user': g.user
        }
