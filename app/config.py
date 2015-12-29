import ConfigParser

from os.path import realpath, isfile, dirname


def load_configuration():
    # resolve paths relative to this file
    app_path = dirname(__file__)
    general_config_path = realpath(app_path + '/../conf/app.ini')
    flask_config_path = realpath(app_path + '/../conf/flask.ini')

    # sanity checks
    if not isfile(general_config_path):
        raise Exception("Sanity Failure: General App config does not exist: [%s]" % general_config_path)

    if not isfile(flask_config_path):
        raise Exception("Sanity Failure: Flask config does not exist: [%s]" % flask_config_path)

    # import twitter secrets and other stuff we don't want to advertise too much
    general_config = ConfigParser.RawConfigParser()
    general_config.read(general_config_path)

    twitter_key = general_config.get('twitter', 'key')
    twitter_secret = general_config.get('twitter', 'secret')

    sentry_dsn = general_config.get('sentry', 'dsn')

    return general_config_path, flask_config_path, twitter_key, twitter_secret, sentry_dsn


(GENERAL_CONFIG_PATH, FLASK_CONFIG_PATH, TWITTER_KEY, TWITTER_SECRET, SENTRY_DSN) = load_configuration()
