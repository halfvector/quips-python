from flask import g
from mongoengine import Q

from ..models import *
from ..protected_resource import AuthenticatedResource


class UserMapper:
    @staticmethod
    def to_web_dto(entity):
        return {
            'createdAt': entity.createdAt.isoformat(),
            'id': entity.id,
            'oauthToken': entity.oauthToken,
            'profileImage': entity.profileImage,
            'username': entity.username
        }


class UserResource(AuthenticatedResource):
    def get(self, user_id):
        try:
            user = User.objects.get(Q(username=user_id))
            return UserMapper.to_web_dto(user), 200
        except User.DoesNotExist:
            return {}, 404


class UserListResource(AuthenticatedResource):
    def get(self):
        return map(UserMapper.to_web_dto, User.objects), 200


class CurrentUserResource(AuthenticatedResource):
    def get(self):
        try:
            user = User.objects.get(id=g.user['id'])
            return UserMapper.to_web_dto(user), 200
        except User.DoesNotExist:
            return {}, 404
