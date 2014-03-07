from flask import url_for, render_template
import app


@app.route('/me')
def my_profile():
    return "this yo profile, bitch!"
    
@app.route('/u/<username>')
def show_user_profile(username):
    return "user: [%s]" % username
    
@app.route('/recordings/<recording>')
def show_recording(recording):
    return render_template('show_recording.html', recording=recording)
    
@app.route('/recordings/post', methods=['POST'])
def post_recording():
    recording=1
    return redirect(url_for('show_recording', recording=recording), code=302)
    
with app.test_request_context():
    #print url_for('HomepageView:show_homepage')
    print url_for('homepage')
    print url_for('my_profile')
    print url_for('show_user_profile', username='unbuffered')