from bson import ObjectId, DBRef
from flask.ext.classy import FlaskView, route
from flask import url_for, redirect, render_template, g, request, session, jsonify, Blueprint
from app import webapp
import os

from models import Recording, User

bp = Blueprint('recordings', __name__, template_folder='templates')

@bp.route('/record')
def show_recorder():
    return render_template(
        'record.html',
        user=g.user
    )

@bp.route('/q/<id>')
def view(id):
    webapp.logger.debug('id: ' + id)

def allowed_file(filename):
    extensions = {'ogg'}
    return '.' in filename and filename.rsplit('.',1)[1] in extensions

@bp.route('/recording/create', methods=['POST'])
def create():
    if 'audio-blob' not in request.files:
        webapp.logger.warning('upload attempted without correct file-key')
        return jsonify(status='failed')

    if 'aid' not in session:
        webapp.logger.warning('upload attempted with session without aid')
        return jsonify(status='failed')

    file = request.files['audio-blob']
    webapp.logger.debug("file: '%s' type: '%s'" % (file.filename, file.content_type))

    if file and file.content_type == 'audio/ogg':
        user = User.objects.get(id=ObjectId(session['aid']))

        recording = Recording()
        recording.description = request.form['description']
        recording.isPublic = True
        recording.user = user # DBRef('user', session['aid'])
        recording.save()

        recordingId = str(recording.id)
        filePath = os.path.join(webapp.config['RECORDINGS_PATH'], recordingId  + '.ogg')
        webapp.logger.debug('saving recording to: ' + filePath)
        file.save(filePath)

        #return redirect(url_for('RecordingsView:view', id=recordingId), code=302)
        return jsonify(status='success', id=recordingId)

    # else file upload failed, show an error page
    return jsonify(status='failed')

@bp.route('/recording/delete', methods=['POST'])
def remove():
    recording=1
    return redirect(url_for('show_recording', recording=recording), code=302)

