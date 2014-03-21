from datetime import datetime
from flask import render_template, g, Blueprint
from models import Recording

bp = Blueprint('homepage', __name__, template_folder='templates')

@bp.route('/')
def index():
    recordings = Recording.objects(description__contains='').order_by('-postedAt')

    now = datetime.now()

    for record in recordings:
        #print now - record.postedAt
        record.age = now - record.postedAt
        record.timestamp = record.postedAt.isoformat()
        if not record.description:
            record.description = "N/A"

    return render_template(
        'homepage.html',
        recordings=recordings,
        user=g.user
    )
