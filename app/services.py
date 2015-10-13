# instantiate all services
from app import config
from os import path
from flask import Flask
from logging import Formatter
from flask.ext.mongoengine import MongoEngineSessionInterface, MongoEngine


def create_app():
    app = Flask(__name__, static_folder='../public/', static_url_path='/public')
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

    # setup database and session storage
    # db settings come from flask.ini
    # and same engine is used for storing sessions
    mongo = MongoEngine()
    mongo.init_app(app)
    app.session_interface = MongoEngineSessionInterface(mongo)

    app.logger.info("Recordings path: " + app.config['RECORDINGS_PATH'])
    app.logger.info("User profile images path: " + app.config['PATH_USER_PROFILE_IMAGE'])

    return app, mongo


print "Instantiating services: Web App and Mongo DB"
(app, db) = create_app()
