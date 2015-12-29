import api

# after app.py configures everything, we can spawn a standalone (non-wsgi) server here
# handy for quick debugging
if __name__ == '__main__':
    from werkzeug.serving import run_simple

    run_simple('0.0.0.0', 5000, api.app, use_reloader=True, use_debugger=True, use_evalex=True)
