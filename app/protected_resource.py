from functools import wraps

from flask import g
from flask.ext.restful import Resource


def authenticate(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        if g.user['id']:
            return func(*args, **kwargs)

        return {}, 401

    return wrapper


class AuthenticatedResource(Resource):
    method_decorators = [authenticate]
