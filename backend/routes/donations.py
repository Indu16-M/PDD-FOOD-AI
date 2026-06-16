import os
import datetime
import qrcode
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
import joblib
import pandas as pd
from models import db, User, FoodDonation, Notification
from config import Config

donations_bp = Blueprint('donations', __name__)

# Helper to load AI Expiry Model
def predict_remaining_shelf_life(food_type, storage_condition, temp, hours_since_prep):
    try:
        if os.path.exists(Config.ML_MODEL_PATH):
            model = joblib.load(Config.ML_MODEL_PATH)
            # Create a dataframe for predictions
            input_df = pd.DataFrame([{
                'food_type': food_type,
                'storage_condition': storage_condition,
                'temperature_celsius': float(temp),
                'hours_since_prep': float(hours_since_prep)
            }])
            pred = model.predict(input_df)[0]
            return max(0.0, float(pred))
    except Exception as e:
        print(f"Error calling ML Model: {e}. Using rule-based fallback.")
        
    # Rule-based fallback calculation (mimics the ML model)
    base_lives = {
        'cooked': 8.0,
        'raw_meat': 12.0,
        'dairy': 24.0,
        'bakery': 36.0,
        'produce': 48.0,
        'packaged': 360.0,
        'dry': 720.0
    }
    base = base_lives.get(food_type, 24.0)
    
    if storage_condition == 'frozen':
        mult = 10.0
    elif storage_condition == 'refrigerated':
        mult = 4.0
    else:
        if food_type in ['raw_meat', 'dairy']:
            mult = 0.2
        elif food_type == 'cooked' and temp > 30.0:
            mult = 0.5
        else:
            mult = 1.0
            
    val = (base * mult) - hours_since_prep
    return max(0.0, val)

@donations_bp.route('', methods=['POST'])
@jwt_required()
def create_donation():
    donor_id = int(get_jwt_identity())
    donor = User.query.get(donor_id)
    
    if not donor or donor.role != 'donor':
        return jsonify({'message': 'Unauthorized. Only donors can create donations.'}), 403
        
    # Handle multipart form data for file uploads + JSON body
    title = request.form.get('title')
    description = request.form.get('description', '')
    food_type = request.form.get('food_type') # 'cooked', 'raw_meat', 'dairy', etc.
    quantity = float(request.form.get('quantity', 0))
    quantity_unit = request.form.get('quantity_unit', 'kg')
    storage_condition = request.form.get('storage_condition') # 'ambient', 'refrigerated', 'frozen'
    temperature_celsius = float(request.form.get('temperature_celsius', 25.0))
    
    prep_time_str = request.form.get('prep_time') # ISO format
    if prep_time_str:
        prep_time = datetime.datetime.fromisoformat(prep_time_str.replace('Z', ''))
    else:
        prep_time = datetime.datetime.utcnow() - datetime.timedelta(hours=1)
        
    if not title or not food_type or not storage_condition or quantity <= 0:
        return jsonify({'message': 'Missing required fields or invalid quantity'}), 400
        
    # Predict Expiry using AI
    now = datetime.datetime.utcnow()
    hours_since_prep = (now - prep_time).total_seconds() / 3600.0
    hours_since_prep = max(0.1, hours_since_prep)
    
    remaining_shelf_life = predict_remaining_shelf_life(food_type, storage_condition, temperature_celsius, hours_since_prep)
    estimated_expiry = now + datetime.timedelta(hours=remaining_shelf_life)
    
    # Classify Risk Level
    if remaining_shelf_life <= 6.0:
        risk_level = 'High Risk'
    elif remaining_shelf_life <= 24.0:
        risk_level = 'Medium Risk'
    else:
        risk_level = 'Safe'
        
    # Handle Image Upload
    image_url = ''
    if 'image' in request.files:
        file = request.files['image']
        if file.filename != '':
            filename = secure_filename(f"donation_{donor_id}_{int(now.timestamp())}_{file.filename}")
            os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)
            file.save(os.path.join(Config.UPLOAD_FOLDER, filename))
            image_url = f"/uploads/{filename}"
            
    donation = FoodDonation(
        donor_id=donor_id,
        title=title,
        description=description,
        food_type=food_type,
        quantity=quantity,
        quantity_unit=quantity_unit,
        storage_condition=storage_condition,
        temperature_celsius=temperature_celsius,
        prep_time=prep_time,
        estimated_expiry=estimated_expiry,
        remaining_shelf_life_hours=round(remaining_shelf_life, 2),
        risk_level=risk_level,
        status='available',
        image_url=image_url
    )
    
    try:
        db.session.add(donation)
        db.session.commit()
        
        # Generate QR Code
        qr_content = f"DONATION-ID:{donation.id}|DONOR:{donor.username}|FOOD:{title}|EXPIRY:{estimated_expiry.isoformat()}"
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(qr_content)
        qr.make(fit=True)
        
        qr_img = qr.make_image(fill_color="black", back_color="white")
        qr_filename = f"qr_{donation.id}.png"
        os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)
        qr_img.save(os.path.join(Config.UPLOAD_FOLDER, qr_filename))
        
        donation.qr_code_data = f"/uploads/{qr_filename}"
        db.session.commit()
        
        # Trigger real-time notifications for nearby NGOs (mock alerting matching NGOs)
        ngos = User.query.filter_by(role='ngo', status='active').all()
        for ngo in ngos:
            notif = Notification(
                user_id=ngo.id,
                type='new_donation',
                title='New Donation Match Nearby!',
                message=f"A new donation '{title}' ({quantity} {quantity_unit}) was posted nearby. Shelf life: {round(remaining_shelf_life, 1)} hrs."
            )
            db.session.add(notif)
        db.session.commit()
        
        return jsonify({
            'message': 'Donation posted successfully',
            'donation': donation.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f"Failed to post donation: {str(e)}"}), 500

@donations_bp.route('', methods=['GET'])
def get_donations():
    # Public route to get available food items
    status_filter = request.args.get('status', 'available')
    food_type_filter = request.args.get('food_type')
    
    query = FoodDonation.query.filter_by(status=status_filter)
    
    if food_type_filter:
        query = query.filter_by(food_type=food_type_filter)
        
    # Exclude expired donations on listing
    now = datetime.datetime.utcnow()
    query = query.filter(FoodDonation.estimated_expiry > now)
    
    donations = query.order_index_by = FoodDonation.estimated_expiry.asc()
    donations = query.all()
    
    return jsonify([d.to_dict() for d in donations]), 200

@donations_bp.route('/history', methods=['GET'])
@jwt_required()
def donation_history():
    donor_id = int(get_jwt_identity())
    donations = FoodDonation.query.filter_by(donor_id=donor_id).order_by(FoodDonation.created_at.desc()).all()
    return jsonify([d.to_dict() for d in donations]), 200

@donations_bp.route('/<int:donation_id>', methods=['GET'])
@jwt_required()
def get_donation_detail(donation_id):
    donation = FoodDonation.query.get_or_404(donation_id)
    return jsonify(donation.to_dict()), 200

@donations_bp.route('/<int:donation_id>/status', methods=['PATCH'])
@jwt_required()
def update_status(donation_id):
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    donation = FoodDonation.query.get_or_404(donation_id)
    
    data = request.get_json() or {}
    new_status = data.get('status')
    
    if not new_status:
        return jsonify({'message': 'Missing status field'}), 400
        
    # Check permissions: Donor, Admin, or NGO if it is assigned to them
    is_owner = (donation.donor_id == user_id)
    is_admin = (user.role == 'admin')
    
    # Check if request is accepted by this NGO
    is_ngo_assigned = False
    if user.role == 'ngo':
        active_req = next((req for req in donation.requests if req.ngo_id == user_id and req.status == 'accepted'), None)
        if active_req:
            is_ngo_assigned = True
            
    if not (is_owner or is_admin or is_ngo_assigned):
        return jsonify({'message': 'Unauthorized to modify this donation status'}), 403
        
    donation.status = new_status
    try:
        db.session.commit()
        return jsonify({
            'message': f"Donation status updated to {new_status}",
            'donation': donation.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f"Failed to update status: {str(e)}"}), 500
