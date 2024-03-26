from flask import Flask, request, redirect, url_for, render_template, session, flash

app = Flask(__name__)

app.secret_key = 'your_secret_key' 

users_db = {}


@app.route('/')
def home():
    return redirect(url_for('index'))

# The protected index page
@app.route('/index')
def index():
    if 'username' in session:
        return 'Welcome to the Index Page, ' + session['username'] + '!'
    else:
        flash('You need to login first!')
        return redirect(url_for('login'))

# The registration page
@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        
        if username in users_db:
            flash('Username already exists!')
            return redirect(url_for('register'))
        
        users_db[username] = password
        flash('Registration successful!')
        return redirect(url_for('login'))
    
    return render_template('register.html')

# The login page
@app.route('/login', methods=['GET', 'POST'])
def login():
    if 'username' in session:
        flash('You are already logged in.')
        return redirect(url_for('index'))

    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        
        if users_db.get(username) == password:
            session['username'] = username
            flash('Logged in successfully!')
            return redirect(url_for('index'))
        
        flash('Invalid username or password!')
    
    return render_template('login.html')

# The logout route
@app.route('/logout')
def logout():
    if 'username' in session:
        session.pop('username')
        flash('You have been logged out.')
    else:
        flash('You are not logged in.')
    return redirect(url_for('login'))

if __name__ == '__main__':
    app.run(debug=True)