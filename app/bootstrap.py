from flask import Flask, url_for, redirect, render_template, session, g
from flask.ext.mongoengine import MongoEngine, MongoEngineSessionInterface
from flask_debugtoolbar import DebugToolbarExtension
from werkzeug.debug import DebuggedApplication
#from flask_oauth import OAuth
from gunicorn.util import getcwd
import os

flask_ap = Flask(__name__, static_folder = 'assets')
flask_ap.config['MONGODB_SETTINGS'] = {'DB': 'quips'}
flask_ap.config['SECRET_KEY'] = 'secretness'

flask_ap.config['TESTING'] = False
flask_ap.config['DEBUG'] = False
flask_ap.config['DEBUG_TB_PANELS'] = (
    'flask.ext.debugtoolbar.panels.versions.VersionDebugPanel',
    'flask.ext.debugtoolbar.panels.timer.TimerDebugPanel',
    'flask.ext.debugtoolbar.panels.headers.HeaderDebugPanel',
    'flask.ext.debugtoolbar.panels.request_vars.RequestVarsDebugPanel',
    'flask.ext.debugtoolbar.panels.template.TemplateDebugPanel',
    'flask.ext.debugtoolbar.panels.logger.LoggingPanel',
    'flask.ext.mongoengine.panels.MongoDebugPanel'

    #'flask_debugtoolbar_lineprofilerpanel.panels.LineProfilerPanel'
)
flask_ap.config['DEBUG_TB_PROFILER_ENABLED'] = False
#flask_ap.config['DEBUG_TB_TEMPLATE_EDITOR_ENABLED'] = True
flask_ap.config['DEBUG_TB_INTERCEPT_REDIRECTS'] = False

flask_ap.debug = True
flask_ap.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024 # 10MB file size limit
#flask_ap.config.from_object(__name__)
flask_ap.config['RECORDINGS_PATH'] = os.path.realpath(getcwd() + '/../public/recordings/')

if not os.path.isdir(flask_ap.config['RECORDINGS_PATH']):
    flask_ap.logger.debug("path does not exist: " + flask_ap.config['RECORDINGS_PATH'])
    exit()

flask_ap.logger.debug("Recordings Path: " + flask_ap.config['RECORDINGS_PATH'])

db = MongoEngine()
db.init_app(flask_ap)

app = DebuggedApplication(flask_ap, evalex=True)

#toolbar = DebugToolbarExtension(flask_ap)

app.session_interface = MongoEngineSessionInterface(db)

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
    app.logger.debug("twitter tokenizer")
    if 'oauth' in session:
        return session['oauth']

