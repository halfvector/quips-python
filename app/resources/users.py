from flask import Blueprint, g
from flask_restful import Resource
from mongoengine import Q

from ..jsonify import *
from ..models import *

class UserResource(Resource):
    def get(self, user_id):
        try:
            user = User.objects.get(Q(username=user_id))
            return mongo_doc_to_json_response(user, 200)
        except User.DoesNotExist:
            return mongo_doc_to_json_response('User not found', 404)

    def put(self):
        return {}

class UserListResource(Resource):
    def get(self):
        return mongo_doc_to_json_response(User.objects, 200)

    def post(self):
        return {}


class CurrentUserResource(Resource):
    def get(self):
        try:
            user = User.objects.get(id=g.user['id'])
            return mongo_doc_to_json_response(user, 200)
        except User.DoesNotExist:
            return mongo_doc_to_json_response('User not found', 404)

    def put(self):
        pass
