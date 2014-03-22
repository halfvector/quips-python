from flask import Flask, session
from flask.ext.mongoengine import MongoEngine, MongoEngineSessionInterface
import os
import ConfigParser

# this is the entry-point, and all bootstrapping should happen here before the flask/db initialization
def load_configuration():

    app_path = os.path.dirname(__file__)

    print "app_path = " + app_path

    general_config_path = os.path.realpath(app_path + '/../conf/app.ini')
    flask_config_path = os.path.realpath(app_path + '/../conf/flask.ini')

    if not os.path.isfile(general_config_path):
        print "Sanity Failure: General App config does not exist: [%s]" % general_config_path
        exit()

    if not os.path.isfile(flask_config_path):
        print "Sanity Failure: Flask config does not exist: [%s]" % flask_config_path
        exit()

    general_config = ConfigParser.RawConfigParser()
    general_config.read(general_config_path)

    twitter_key = general_config.get('twitter', 'key')
    twitter_secret = general_config.get('twitter', 'secret')

    return (general_config_path, flask_config_path, twitter_key, twitter_secret)

def create_app():
    app = Flask(__name__, static_folder = 'assets')
    app.config.from_pyfile(FLASK_CONFIG_PATH)

    from logging import Formatter
    format = Formatter("[%(levelname)s] [%(asctime)s] %(pathname)s:%(lineno)d - %(message)s")
    app.logger.handlers[0].setFormatter(format)

    app_path = os.path.dirname(__file__)
    app.config['RECORDINGS_PATH'] = os.path.realpath(app_path + '/../public/recordings/')
    app.config['PATH_USER_PROFILE_IMAGE'] = os.path.realpath(app_path + '/../public/profile_images/')

    if not os.path.isdir(app.config['RECORDINGS_PATH']):
        app.logger.error("Recordings path does not exist: " + app.config['RECORDINGS_PATH'])
        exit()

    app.logger.info("> Recordings path: " + app.config['RECORDINGS_PATH'])
    app.logger.info("> User profile images path: " + app.config['PATH_USER_PROFILE_IMAGE'])

    db = MongoEngine()
    db.init_app(app)

    app.session_interface = MongoEngineSessionInterface(db)

    return (app, db)

print "Analyzing configuration.."
(GENERAL_CONFIG_PATH, FLASK_CONFIG_PATH, TWITTER_KEY, TWITTER_SECRET) = load_configuration()

print "Spawning Web App and ODM.."
(webapp, db) = create_app()
