from app import webapp, db
import homepage, recordings, auth, user

webapp.register_blueprint(homepage.bp)
webapp.register_blueprint(recordings.bp)
webapp.register_blueprint(auth.bp)
webapp.register_blueprint(user.bp)