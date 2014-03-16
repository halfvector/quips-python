from flask import Flask, session
from flask.ext.mongoengine import MongoEngine, MongoEngineSessionInterface
#from flask_oauth import OAuth
from gunicorn.util import getcwd
import os
from werkzeug.debug import DebuggedApplication

def create_app():
    app = Flask(__name__, static_folder = 'assets')
    app.config['MONGODB_SETTINGS'] = {'DB': 'quips'}
    app.config['SECRET_KEY'] = 'secretness'

    app.config['TESTING'] = False
    app.config['DEBUG'] = False
    app.config['DEBUG_TB_PANELS'] = (
        'flask.ext.debugtoolbar.panels.versions.VersionDebugPanel',
        'flask.ext.debugtoolbar.panels.timer.TimerDebugPanel',
        'flask.ext.debugtoolbar.panels.headers.HeaderDebugPanel',
        'flask.ext.debugtoolbar.panels.request_vars.RequestVarsDebugPanel',
        'flask.ext.debugtoolbar.panels.template.TemplateDebugPanel',
        'flask.ext.debugtoolbar.panels.logger.LoggingPanel',
        'flask.ext.mongoengine.panels.MongoDebugPanel'

        #'flask_debugtoolbar_lineprofilerpanel.panels.LineProfilerPanel'
    )
    app.config['DEBUG_TB_PROFILER_ENABLED'] = False
    #flask_ap.config['DEBUG_TB_TEMPLATE_EDITOR_ENABLED'] = True
    app.config['DEBUG_TB_INTERCEPT_REDIRECTS'] = False

    app.debug = True
    app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024 # 10MB file size limit
    #flask_ap.config.from_object(__name__)
    app.config['RECORDINGS_PATH'] = os.path.realpath(getcwd() + '/../public/recordings/')

    if not os.path.isdir(app.config['RECORDINGS_PATH']):
        app.logger.debug("path does not exist: " + app.config['RECORDINGS_PATH'])
        exit()

    app.logger.debug("Recordings Path: " + app.config['RECORDINGS_PATH'])

    db = MongoEngine()
    db.init_app(app)

    #toolbar = DebugToolbarExtension(flask_ap)

    app.session_interface = MongoEngineSessionInterface(db)

    return (app, db)

print "spawning webapp and db.."

(webapp, db) = create_app()

# init twitter oauth
# oauth = OAuth()
# twitter = oauth.remote_app(
#     'twitter',
#     base_url='https://api.twitter.com/1/',
#     request_token_url='https://api.twitter.com/oauth/request_token',
#     access_token_url='https://api.twitter.com/oauth/access_token',
#     authorize_url='https://api.twitter.com/oauth/authenticate',
#     consumer_key='3v4UIfTkiYRq1xaH6suZKA',
#     consumer_secret='Ftb9ffIAccJPXULkpNo66c9FGJUohRRO027twv4Oc'
# )
# twitter.flask_ap = flask_ap

#@twitter.tokengetter
def get_twitter_token():
    webapp.logger.debug("twitter tokenizer")
    if 'oauth' in session:
        return session['oauth']

