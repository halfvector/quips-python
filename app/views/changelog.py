from flask import render_template, g, Blueprint

bp = Blueprint('changelog', __name__, template_folder='templates')


@bp.route('/changelog')
def index():
    return render_template(
        'changelog.html',
        user=g.user
    )
