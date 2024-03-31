from flask import Flask, render_template, request, redirect, url_for, flash, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from werkzeug.security import generate_password_hash, check_password_hash
import uuid
from datetime import datetime
from flask_migrate import Migrate
import string, requests, secrets
import google.oauth2.credentials
import google_auth_oauthlib.flow
from authlib.integrations.flask_client import OAuth
import os
      
from dotenv import load_dotenv
load_dotenv()  # Load environment variables from .env file
app = Flask(__name__)
oauth = OAuth(app)
app.config['SECRET_KEY'] = 'your-secret-key-here'
app.config['GOOGLE_CLIENT_ID'] = 'GOOGLE_CLIENT_ID'
app.config['GOOGLE_CLIENT_SECRET'] = "GOOGLE_CLIENT_SECRET"
app.config['GITHUB_CLIENT_ID'] = "GITHUB_CLIENT_ID"
app.config['GITHUB_CLIENT_SECRET'] = "GITHUB_CLIENT_SECRET"
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///db.sqlite'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False



      
google = oauth.register(
    name='google',
    client_id=app.config['GOOGLE_CLIENT_ID'],
    client_secret=app.config['GOOGLE_CLIENT_SECRET'],
    access_token_url='https://accounts.google.com/o/oauth2/token',
    access_token_params=None,
    authorize_url='https://accounts.google.com/o/oauth2/auth',
    authorize_params=None,
    api_base_url='https://www.googleapis.com/oauth2/v1/',
    userinfo_endpoint='https://openidconnect.googleapis.com/v1/userinfo',
    client_kwargs={'scope': 'openid email profile'},
    jwks_uri = "https://www.googleapis.com/oauth2/v3/certs"
)


github = oauth.register (
  name = 'github',
    client_id = app.config["GITHUB_CLIENT_ID"],
    client_secret = app.config["GITHUB_CLIENT_SECRET"],
    access_token_url = 'https://github.com/login/oauth/access_token',
    access_token_params = None,
    authorize_url = 'https://github.com/login/oauth/authorize',
    authorize_params = None,
    api_base_url = 'https://api.github.com/',
    client_kwargs = {'scope': 'user:email'},
)

db = SQLAlchemy(app)
migrate = Migrate(app, db)

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(150), unique=True)
    password = db.Column(db.String(150))

class Snippet(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    unique_id = db.Column(db.String(36), unique=True, default=lambda: str(uuid.uuid4()))
    html_code = db.Column(db.Text, nullable=True)
    css_code = db.Column(db.Text, nullable=True)
    js_code = db.Column(db.Text, nullable=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    user = db.relationship('User', backref=db.backref('snippets', lazy=True))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

@app.route('/')
@login_required
def index():
    return render_template('index.html', user=current_user)

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        user = User.query.filter_by(username=username).first()
        if user and check_password_hash(user.password, password):
            login_user(user)
            return redirect(url_for('index'))
        flash('Invalid username or password')
    return render_template('login.html')

@app.route('/signup', methods=['GET', 'POST'])
def signup():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        user = User.query.filter_by(username=username).first()
        if user:
            flash('Username already exists')
            return redirect(url_for('signup'))
        hashed_password = generate_password_hash(password)
        new_user = User(username=username, password=hashed_password)
        db.session.add(new_user)
        db.session.commit()
        flash('Account created successfully, please login.')
        return redirect(url_for('login'))
    return render_template('signup.html')




# Google login route
@app.route('/login/google')
def google_login():
    google = oauth.create_client('google')
    redirect_url = url_for('google_authorize', _external=True)
    return google.authorize_redirect(redirect_url)


# Google authorize route
@app.route('/login/google/authorize')
def google_authorize():
    google = oauth.create_client('google')  # Reuse the OAuth client
    token = google.authorize_access_token()  # Retrieve the access token
    resp = google.get('userinfo').json()  # Use the token to fetch the user info
    # print(resp.keys())
    # Assuming 'sub' is the unique identifier for the user in Google's response
    user = User.query.filter_by(username=resp['email']).first()
    
    if not user:
        # If the user doesn't exist, create a new one
        user = User(
            username=resp['email']
            # Other fields...
        )
        db.session.add(user)
        db.session.commit()
    print('Check: ' ,user.username, '\n')   
    login_user(user)
    
    return redirect(url_for('index'))

# Github login route
@app.route('/login/github')
def github_login():
    github = oauth.create_client('github')
    redirect_uri = url_for('github_authorize', _external=True)
    return github.authorize_redirect(redirect_uri)


# Github authorize route
@app.route('/login/github/authorize')
def github_authorize():
    github = oauth.create_client('github')
    token = github.authorize_access_token()
    resp = github.get('user').json()
    
    user = User.query.filter_by(username=resp['login']).first()
    
    if not user:
        # If the user doesn't exist, create a new one
        user = User(
            username=resp['login']
            # Other fields...
        )
        db.session.add(user)
        db.session.commit()
    login_user(user)
    # return "You are successfully signed in using github"
    
    return redirect(url_for('index'))
    
@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('login'))

@app.route('/save_snippet', methods=['POST'])
@login_required
def save_snippet():
    data = request.get_json()
    new_snippet = Snippet(html_code=data['html_code'], css_code=data['css_code'], js_code=data['js_code'], user_id=current_user.id)
    db.session.add(new_snippet)
    db.session.commit()
    return jsonify({'unique_id': new_snippet.unique_id})

@app.route('/snippets')
@login_required
def view_snippets():
    snippets = Snippet.query.filter_by(user_id=current_user.id).all()
    return render_template('view_snippets.html', snippets=snippets)

@app.route('/snippet/<unique_id>')
@login_required
def view_snippet(unique_id):
    snippet = Snippet.query.filter_by(unique_id=unique_id).first_or_404()
    if snippet.user_id != current_user.id:
        flash('Unauthorized access!')
        return redirect(url_for('index'))
    return render_template('view_snippet.html', snippet=snippet)

@app.route('/share/<unique_id>')
def share(unique_id):
    snippet = Snippet.query.filter_by(unique_id=unique_id).first_or_404()
    return render_template('share.html', snippet=snippet)

@app.route('/share/output/<unique_id>')
def share_output(unique_id):
    snippet = Snippet.query.filter_by(unique_id=unique_id).first_or_404()
    return render_template('share_output.html', snippet=snippet)
@app.route('/sw.js')
def sw():
    return app.send_static_file('sw.js')

# Dictionary to store the code snippets
snippet_links = {}

def generate_unique_link():
    """Generate a unique shareable link"""
    characters = string.ascii_letters + string.digits
    unique_id = ''.join(secrets.choice(characters) for _ in range(8))
    # Adjust this URL to your actual application's domain in production
    return request.url_root + 'shared/' + unique_id

@app.route('/share_snippet', methods=['POST'])
def share_snippet():
    """Generate a unique shareable link for the code snippets"""
    code_snippets = request.get_json()
    unique_id = secrets.token_urlsafe(16)  # Generates a URL-safe text string
    snippet_links[unique_id] = code_snippets  # Store the code snippets in the dictionary

    full_link = url_for('shared_snippet', link_id=unique_id, _external=True)  # Generates a full URL
    return jsonify({'shareLink': full_link})

@app.route('/shared/<link_id>')
def shared_snippet(link_id):
    """Render the shared code snippet"""
    snippet = snippet_links.get(link_id)

    if snippet:
        return render_template('shared_snippet.html', snippet=snippet)

    return 'Invalid link', 404

# ... remaining code ...

if __name__ == '__main__':
    app.run(debug=True)
