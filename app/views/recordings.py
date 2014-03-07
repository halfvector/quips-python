from flask.ext.classy import FlaskView
from flask import url_for, redirect

from bootstrap import app


class RecordingsView(FlaskView):
    route_base = '/recordings/'

    @app.route('/create', methods=['POST'])
    def create(self):
        recording=1
        return redirect(url_for('show_recording', recording=recording), code=302)

    @app.route('/delete', methods=['POST'])
    def remove(self):
        recording=1
        return redirect(url_for('show_recording', recording=recording), code=302)


RecordingsView.register(app)
