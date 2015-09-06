from flask import Flask, session, send_from_directory
from flask.ext.mongoengine import MongoEngine, MongoEngineSessionInterface
from os import path
import ConfigParser

# this is the entry-point. all bootstrapping happens in this file.


def load_configuration():

    # resolve paths relative to this file
    app_path = path.dirname(__file__)
    general_config_path = path.realpath(app_path + '/../conf/app.ini')
    flask_config_path = path.realpath(app_path + '/../conf/flask.ini')

    # sanity checks
    if not path.isfile(general_config_path):
        raise Exception("Sanity Failure: General App config does not exist: [%s]" % general_config_path)

    if not path.isfile(flask_config_path):
        raise Exception("Sanity Failure: Flask config does not exist: [%s]" % flask_config_path)

    # import twitter secrets and other stuff we don't want to advertise too much
    general_config = ConfigParser.RawConfigParser()
    general_config.read(general_config_path)

    twitter_key = general_config.get('twitter', 'key')
    twitter_secret = general_config.get('twitter', 'secret')

    return (general_config_path, flask_config_path, twitter_key, twitter_secret)

def create_app():
    app = Flask(__name__, static_folder = '../public/', static_url_path = '/public')
    app.config.from_pyfile(FLASK_CONFIG_PATH)

    # change debug output formatter to a pretty one-liner
    from logging import Formatter
    format = Formatter("[%(levelname)s] %(asctime)s | %(pathname)s:%(lineno)d | %(message)s")
    app.logger.handlers[0].setFormatter(format)

    # resolve paths relative to this file
    app_path = path.dirname(__file__)
    app.config.update({
        'RECORDINGS_PATH': path.realpath(app_path + '/../public/recordings/'),
        'PATH_USER_PROFILE_IMAGE': path.realpath(app_path + '/../public/profile_images/'),
        'PATH_ASSETS': path.realpath(app_path + '/../public/assets/'),
    })

    # sanity checks
    if not path.isdir(app.config['RECORDINGS_PATH']):
        raise Exception("Recordings path does not exist: " + app.config['RECORDINGS_PATH'])

    if not path.isdir(app.config['PATH_USER_PROFILE_IMAGE']):
        raise Exception("User profile images path does not exist: " + app.config['PATH_USER_PROFILE_IMAGE'])

    # setup database and session storage
    # db settings come from flask.ini
    # and same engine is used for storing sessions
    db = MongoEngine()
    db.init_app(app)
    app.session_interface = MongoEngineSessionInterface(db)

    app.logger.info("> Recordings path: " + app.config['RECORDINGS_PATH'])
    app.logger.info("> User profile images path: " + app.config['PATH_USER_PROFILE_IMAGE'])

    return (app, db)

print "Loading configuration"
(GENERAL_CONFIG_PATH, FLASK_CONFIG_PATH, TWITTER_KEY, TWITTER_SECRET) = load_configuration()

print "Spawning Web App and ODM"
(webapp, db) = create_app()

# static file paths (when running without nginx)

@webapp.route('/profile_images/<path:filename>')
def profile_images(filename):
	print "sending a profile image: " + filename
	return send_from_directory(webapp.config['PATH_USER_PROFILE_IMAGE'], filename)


@webapp.route('/assets/<path:filename>')
def assets_js(filename):
	print "sending static asset " + filename
	return send_from_directory(webapp.config['PATH_ASSETS'], filename)
