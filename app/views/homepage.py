from datetime import datetime
from flask import render_template, g, Blueprint, url_for
from mongoengine import Q

from models import Recording
import tinyurl


bp = Blueprint('homepage', __name__, template_folder='templates')

@bp.route('/')
def index():
    recordings = Recording.objects(Q(isPublic = True))[:50].order_by('-postedAt')

    print g.user['id']

    for record in recordings:
        record.timestamp = record.postedAt.isoformat()
        record.isMine = record.user.id == g.user['id']
        
        tinyId = tinyurl.encode(str(record.id))
        record.publicUrl = url_for('user.one_recording', recordingId=tinyId)
        
        if not record.description:
            record.description = "N/A"

    return render_template(
        'homepage.html',
        recordings=recordings,
        user=g.user
    )
