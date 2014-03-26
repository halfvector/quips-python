from datetime import datetime
from flask import render_template, g, Blueprint, session
from mongoengine import Q

from models import Recording, User

bp = Blueprint('homepage', __name__, template_folder='templates')

@bp.route('/')
def index():
    recordings = Recording.objects(Q(isPublic = True))[:50].order_by('-postedAt')

    now = datetime.now()

    print g.user['id']

    for record in recordings:
        record.timestamp = record.postedAt.isoformat()
        record.isMine = record.user.id == g.user['id']
        if not record.description:
            record.description = "N/A"

    return render_template(
        'homepage.html',
        recordings=recordings,
        user=g.user
    )
