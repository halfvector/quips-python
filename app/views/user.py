from datetime import datetime
from flask import render_template, g, Blueprint
from models import Recording, User

bp = Blueprint('user', __name__, template_folder='templates')

@bp.route('/u/<username>')
def user_recordings(username):
    user, user_not_found = User.objects.get_or_create(username=username)
    if user_not_found:
        # user not found
        print "warning: user not found!"
        return

    # there has to be a cleaner way to do this
    recordings = Recording.objects(__raw__={'user':str(user.id)}).order_by('-postedAt')

    now = datetime.now()

    for record in recordings:
        record.age = now - record.postedAt
        record.timestamp = record.postedAt.isoformat()
        if not record.description:
            record.description = "N/A"

    return render_template(
        'user_recordings.html',
        recordings=recordings,
        user=g.user
    )

