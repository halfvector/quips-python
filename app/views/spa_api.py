from flask import g, Blueprint, session, jsonify
from mongoengine import Q

from ..models import Recording

bp = Blueprint('spa', __name__, template_folder='templates')


@bp.route('/api/create_recording')
def api_create_recording():
    user_id = session.get('userId')
    num_recordings = Recording.objects(Q(user=user_id)).count()
    return jsonify({
        'num_recordings': num_recordings,
        'user': g.user
    })
