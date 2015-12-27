from flask import g
from flask.ext.restful import reqparse
from mongoengine import Q

from ..protected_resource import AuthenticatedResource
from ..jsonify import *
from ..models import *


class ListenResource(AuthenticatedResource):
    def get(self, user_id, recording_id):
        try:
            status = Listen.objects.get(Q(user=user_id) & Q(recording=recording_id))
        except Listen.DoesNotExist:
            status = Listen(user=user_id, recording=recording_id, progress=0)
        return status

    def put(self, quip_id):
        parser = reqparse.RequestParser()
        parser.add_argument('duration', type=int, location='json')
        parser.add_argument('position', type=int, location='json')
        parser.add_argument('progress', type=int, location='json')
        update = parser.parse_args()
        print "updating progress", update['progress']

        Listen.objects(Q(user=g.user['id']) & Q(recording=quip_id)).modify(
            upsert=True,
            set__progress=update['progress'],
            set__position=update['position'],
            set__duration=update['duration'],
        )

        return {}, 200


class ListenListResource(AuthenticatedResource):
    def get(self):
        return Listen.objects.get_or_404(Q(user=g.user['id']))

    def post(self):
        return {}
