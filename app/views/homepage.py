from flask.ext.classy import FlaskView, route
from flask import redirect, render_template, url_for, request, flash, session, g
from pprint import pprint

from models import Recording, User
from bootstrap import app

class HomepageView(FlaskView):
    route_base = '/'

    @route('/')
    def index(self):
        #users = User.objects(username=session['username'])
        recordings = Recording.objects(description__contains='')
        return render_template(
            'homepage.html',
            recordings=recordings,
            user=g.user
        )


HomepageView.register(app)
