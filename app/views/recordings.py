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

@bp.route('/recording/publish/<recording_id>', methods=['POST'])
def toggle_public(recording_id):
    """Toggle private/public bit on recording. Must only work on a recording caller owns"""
    
    try:
        is_public = request.form['isPublic']
        print "Making recording: %s public: %s" % (recording_id, is_public)
        recording = Recording.objects.get(id = recording_id, user = g.user['id'])
        recording.isPublic = is_public == 'true'
        recording.save()
        return jsonify(status='success')
    except Exception as err:
        print "Error while toggling isPublic:"
        print err
        return jsonify(status='failed', error=err.message)    
    

@bp.route('/recording/create', methods=['POST'])
def create():
    
    if 'audio-blob' not in request.files:
        webapp.logger.warning('upload attempted without correct file-key')
        return jsonify(status='failed')

    if 'userId' not in session:
        webapp.logger.warning('upload attempted with session without aid')
        return jsonify(status='failed')

    file = request.files['audio-blob']
    webapp.logger.debug("file: '%s' type: '%s'" % (file.filename, file.content_type))

    if file and file.content_type == 'audio/ogg':
        user = User.objects.get(id=ObjectId(session['userId']))

        recording = Recording()
        recording.description = request.form['description']
        recording.isPublic = True
        recording.user = user
        recording.save()

        recordingId = str(recording.id)
        filePath = os.path.join(webapp.config['RECORDINGS_PATH'], recordingId  + '.ogg')
        webapp.logger.debug('saving recording to: ' + filePath)
        file.save(filePath)

        #return redirect(url_for('RecordingsView:view', id=recordingId), code=302)
        #return jsonify(status='success', id=recordingId)
        
        #url = url_for('user.user_one_recording', username=g.user['username'], id=recordingId)
        url = url_for('user.user_recordings', username=g.user['username'])
        return jsonify(status='success', url=url)
        
        #return jsonify(status='success', id=7777777, url='/%s/%s' % (g.user['username'], 7777))

    # else file upload failed, show an error page
    return jsonify(status='failed')

@bp.route('/recording/delete', methods=['POST'])
def remove():
    # TODO: implement deleting recordings
    recording=1
    return redirect(url_for('show_recording', recording=recording), code=302)

