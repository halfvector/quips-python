# instantiate all services
import json
from functools import wraps
from logging import Formatter
from os import path

from flask import Flask, Response
from flask.ext.mongoengine import MongoEngineSessionInterface, MongoEngine
from flask.ext.restful import Api

from app import config
from jsonify import MongoJsonEncoder


# force automatic jsonification of dictionary/list objects for plain flask views
# thanks to http://derrickgilland.com/posts/automatic-json-serialization-in-flask-views/
class ResponseJSON(Response):
    """Extend flask.Response with support for list/dict conversion to JSON."""

    def __init__(self, content=None, *args, **kargs):
        if isinstance(content, (list, dict)):
            kargs['mimetype'] = 'application/json'
            content = json.dumps(content, cls=MongoJsonEncoder)

        super(Response, self).__init__(content, *args, **kargs)

    @classmethod
    def force_type(cls, response, environ=None):
        """Override with support for list/dict."""
        if isinstance(response, (list, dict)):
            return cls(response)
        else:
            return super(Response, cls).force_type(response, environ)


def create_app():
    app = Flask(__name__, static_folder='../public/', static_url_path='/public')
    app.response_class = ResponseJSON
    app.config.from_pyfile(config.FLASK_CONFIG_PATH)

    # change debug output formatter to a pretty one-liner
    format = Formatter("%(levelname)6s | %(relativeCreated)6d | %(filename)s:%(lineno)d | %(message)s")
    app.logger.handlers[0].setFormatter(format)

    # resolve paths relative to this file
    app_path = path.dirname(__file__)
    app.config.update({
        'RECORDINGS_PATH': path.realpath(app_path + '/../public/recordings/'),
        'PATH_USER_PROFILE_IMAGE': path.realpath(app_path + '/../public/profile_images/'),
        'PATH_ASSETS': path.realpath(app_path + '/../public/assets/'),
        'PATH_PUBLIC': path.realpath(app_path + '/../public/'),
    })

    # sanity checks
    if not path.isdir(app.config['RECORDINGS_PATH']):
        raise Exception("Recordings path does not exist: " + app.config['RECORDINGS_PATH'])

    if not path.isdir(app.config['PATH_USER_PROFILE_IMAGE']):
        raise Exception("User profile images path does not exist: " + app.config['PATH_USER_PROFILE_IMAGE'])

    # app.json_encoder = MongoJsonEncoder

    # setup database and session storage
    # db settings come from flask.ini
    # and same engine is used for storing sessions
    mongo = MongoEngine()
    mongo.init_app(app)
    app.session_interface = MongoEngineSessionInterface(mongo)

    # toolbar = DebugToolbarExtension(app)

    app.logger.info("Recordings path: " + app.config['RECORDINGS_PATH'])
    app.logger.info("User profile images path: " + app.config['PATH_USER_PROFILE_IMAGE'])

    return app, mongo


print "Instantiating services: Web App and Mongo DB"
(app, db) = create_app()

api = Api(app)


def requires_auth(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        if g.user['id']:
            return func(*args, **kwargs)

        return {}, 401

    return wrapper


# configure api to use special mongo-compatible json serializer
@api.representation('application/json')
def serialize_resource_mongo_objs(obj, status, headers=None):
    return Response(json.dumps(obj, cls=MongoJsonEncoder), status=status, mimetype="application/json")

# hookup error handling
# sentry = Sentry(app, dsn=config.SENTRY_DSN)
