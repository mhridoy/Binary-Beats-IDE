from flask import Flask, render_template, request, redirect, url_for, flash, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from werkzeug.security import generate_password_hash, check_password_hash
import uuid
from datetime import datetime
from flask_migrate import Migrate

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-here'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///db.sqlite'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

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

if __name__ == '__main__':
    app.run(debug=True)
