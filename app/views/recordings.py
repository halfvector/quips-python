from bson import ObjectId, DBRef
from flask.ext.classy import FlaskView, route
from flask import url_for, redirect, render_template, g, request, session, jsonify
import os

from bootstrap import app
from models import Recording, User

class RecordingsView(FlaskView):
    route_base = '/'

    @route('/record')
    def record(self):
        return render_template(
            'record.html',
            user=g.user
        )

    @route('/q/<id>')
    def view(self, id):
        app.logger.debug('id: ' + id)

    def allowed_file(self, filename):
        extensions = {'ogg'}
        return '.' in filename and filename.rsplit('.',1)[1] in extensions

    @route('/recording/create', methods=['POST'])
    def create(self):
        if 'audio-blob' not in request.files:
            app.logger.warning('upload attempted without correct file-key')
            return jsonify(status='failed')

        if 'aid' not in session:
            app.logger.warning('upload attempted with session without aid')
            return jsonify(status='failed')

        file = request.files['audio-blob']
        app.logger.debug("file: '%s' type: '%s'" % (file.filename, file.content_type))

        if file and file.content_type == 'audio/ogg':
            #user = User.objects.get(id=ObjectId(session['aid']))

            recording = Recording()
            recording.description = ''
            recording.isPublic = True
            recording.user = DBRef('user', session['aid'])
            recording.save()

            recordingId = str(recording.id)
            filePath = os.path.join(app.config['RECORDINGS_PATH'], recordingId  + '.ogg')
            app.logger.debug('saving recording to: ' + filePath)
            file.save(filePath)

            #return redirect(url_for('RecordingsView:view', id=recordingId), code=302)
            return jsonify(status='success', id=recordingId)

        # else file upload failed, show an error page
        return jsonify(status='failed')

    @route('/recording/delete', methods=['POST'])
    def remove(self):
        recording=1
        return redirect(url_for('show_recording', recording=recording), code=302)


RecordingsView.register(app)
