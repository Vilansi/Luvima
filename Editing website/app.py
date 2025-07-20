from flask import Flask, render_template, request, redirect, url_for, send_from_directory, jsonify
from PIL import Image, ImageEnhance, ImageOps, ImageFilter
import os
from flask_cors import CORS
import requests
import io
import traceback
from datetime import datetime
from flask import Flask, render_template, request, redirect, url_for, session, jsonify
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from flask_mail import Mail, Message

app = Flask(__name__)

#for user authentication and registration with SQLAlchemy
app.secret_key = '346c7dea2f49dea9b2a9949e207cfe15'  # Change this!
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///users.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# User model
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(150), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)

# Create DB
with app.app_context():
    db.create_all()

# @app.route('/register', methods=['GET', 'POST'])
# def register():
#     if request.method == 'POST':
#         username = request.form['username']
#         password = request.form['password']
#         hashed_password = generate_password_hash(password)

#         if User.query.filter_by(username=username).first():
#             return 'Username already exists!'

#         new_user = User(username=username, password=hashed_password)
#         db.session.add(new_user)
#         db.session.commit()
#         return redirect(url_for('login'))

#     return render_template('register.html')
@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form['username']  # assuming email as username
        password = request.form['password']
        hashed_password = generate_password_hash(password)

        # Check if user already exists
        if User.query.filter_by(username=username).first():
            return 'Username already exists!'

        # Save new user to database
        new_user = User(username=username, password=hashed_password)
        db.session.add(new_user)
        db.session.commit()

        # ✅ Send confirmation email here
        try:
            msg = Message("Registration Successful",
                          recipients=[username])  # Assuming username is the email
            msg.body = f"Hello {username},\n\nYou have successfully registered to Luvima Advanced Image Editor.\n\nHappy editing!"
            mail.send(msg)
        except Exception as e:
            print("Email sending failed:", e)

        return redirect(url_for('login'))

    return render_template('register.html')


# Mail configuration (example using Gmail)
app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = 'mansihosting22@gmail.com'       # Replace with your email
app.config['MAIL_PASSWORD'] = 'zwhkglmuzdeduadj'     # Replace with your app password
app.config['MAIL_DEFAULT_SENDER'] = 'mansihosting22@gmail.com' # Usually same as MAIL_USERNAME

mail = Mail(app)


@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']

        user = User.query.filter_by(username=username).first()
        if user and check_password_hash(user.password, password):
            session['username'] = username
            return redirect(url_for('main'))
        else:
            return 'Invalid username or password'

    return render_template('login.html')

@app.route('/logout')
def logout():
    session.pop('username', None)
    return redirect(url_for('login', message='logged_out'))


@app.route('/main')
def main():
    if 'username' in session:
        return render_template('main.html', username=session['username'])
    return redirect(url_for('login'))

CORS(app)  # Enable CORS for all routes
app.config['UPLOAD_FOLDER'] = 'static/uploads'
app.config['EDITED_FOLDER'] = 'static/edited'
app.config['ALLOWED_EXTENSIONS'] = {'png', 'jpg', 'jpeg', 'gif'}

# Ensure folders exist
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs(app.config['EDITED_FOLDER'], exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

@app.route('/') # Home route
def home():
    return render_template('index.html')

@app.route('/main')  # Main page route
def main_page():
    return render_template('main.html')


@app.route('/apply_filter', methods=['POST'])
def apply_filter():
    filename = request.form['filename']
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    img = Image.open(filepath)

    # Apply filters from form data
    brightness = float(request.form.get('brightness', 1))
    contrast = float(request.form.get('contrast', 1))
    saturation = float(request.form.get('saturation', 1))
    blur = float(request.form.get('blur', 0))
    rotation = int(request.form.get('rotation', 0))
    flip_horizontal = request.form.get('flip_horizontal') == 'true'
    flip_vertical = request.form.get('flip_vertical') == 'true'

    # Apply transformations
    if brightness != 1:
        img = ImageEnhance.Brightness(img).enhance(brightness)
    if contrast != 1:
        img = ImageEnhance.Contrast(img).enhance(contrast)
    if saturation != 1:
        img = ImageEnhance.Color(img).enhance(saturation)
    if blur > 0:
        img = img.filter(ImageFilter.GaussianBlur(radius=blur))
    if rotation:
        img = img.rotate(rotation, expand=True)
    if flip_horizontal:
        img = ImageOps.mirror(img)
    if flip_vertical:
        img = ImageOps.flip(img)

    # Save edited image
    edited_filename = 'edited_' + filename
    edited_path = os.path.join(app.config['EDITED_FOLDER'], edited_filename)
    img.save(edited_path)

    return jsonify({'url': url_for('static', filename=f'edited/{edited_filename}')})


@app.route('/crop', methods=['POST'])
def crop_image():
    filename = request.form['filename']
    x = int(request.form['x'])
    y = int(request.form['y'])
    width = int(request.form['width'])
    height = int(request.form['height'])
    
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    img = Image.open(filepath)
    cropped_img = img.crop((x, y, x + width, y + height))

    cropped_filename = 'cropped_' + filename
    cropped_path = os.path.join(app.config['EDITED_FOLDER'], cropped_filename)
    cropped_img.save(cropped_path)

    return jsonify({'url': url_for('static', filename=f'edited/{cropped_filename}')})

# remove background route
@app.route('/remove_bg', methods=['POST'])
def remove_bg():
    # Placeholder - no AI integration here
    return jsonify({'message': 'Background removal would require AI service integration.'})



if __name__ == '__main__':
    app.run(debug=True)
