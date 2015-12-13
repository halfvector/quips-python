from flask import g
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

    def put(self):
        return {}


class ListenListResource(AuthenticatedResource):
    def get(self):
        return Listen.objects.get_or_404(Q(user=g.user['id']))

    def post(self):
        return {}
