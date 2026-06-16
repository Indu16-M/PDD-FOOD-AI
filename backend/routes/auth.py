from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from models import db, User, NgoProfile

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    
    username = data.get('username', '').strip() if data.get('username') else None
    email = data.get('email', '').strip() if data.get('email') else None
    password = data.get('password')
    role = data.get('role')  # 'donor', 'ngo'
    
    if not username or not email or not password or not role:
        return jsonify({'message': 'Missing required fields'}), 400
        
    if role not in ['donor', 'ngo']:
        return jsonify({'message': 'Invalid role type. Must be donor or ngo'}), 400
        
    # Check if user already exists
    if User.query.filter((User.username == username) | (User.email == email)).first():
        return jsonify({'message': 'Username or Email already registered'}), 400
        
    # Get location and phone coordinates if provided
    latitude = float(data.get('latitude', 12.9716)) # default Bengaluru coordinates
    longitude = float(data.get('longitude', 77.5946))
    address = data.get('address', '')
    phone = data.get('phone', '')
    
    # NGO details
    status = 'active'
    if role == 'ngo':
        # Admin must approve NGOs before they can accept donations (or start as pending)
        status = 'pending_approval'
        
    user = User(
        username=username,
        email=email,
        role=role,
        latitude=latitude,
        longitude=longitude,
        address=address,
        phone=phone,
        status=status
    )
    user.set_password(password)
    
    try:
        db.session.add(user)
        db.session.commit()
        
        # If user is NGO, create profile
        if role == 'ngo':
            ngo_name = data.get('organization_name', f"{username} Foundation")
            reg_num = data.get('registration_number', 'PENDING-REG')
            tax_id = data.get('tax_id', '')
            capacity = int(data.get('capacity_people', 100))
            pref_types = data.get('preferred_food_types', 'all')
            website = data.get('website', '')
            
            ngo_prof = NgoProfile(
                user_id=user.id,
                organization_name=ngo_name,
                registration_number=reg_num,
                tax_id=tax_id,
                capacity_people=capacity,
                preferred_food_types=pref_types,
                website=website,
                verified=False
            )
            db.session.add(ngo_prof)
            db.session.commit()
            
        return jsonify({
            'message': f"User registered successfully. Status: {status}",
            'user': user.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f"Registration failed: {str(e)}"}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    username = data.get('username', '').strip() if data.get('username') else None
    password = data.get('password')
    
    if not username or not password:
        return jsonify({'message': 'Missing username or password'}), 400
        
    user = User.query.filter_by(username=username).first()
    
    if not user or not user.check_password(password):
        return jsonify({'message': 'Invalid credentials'}), 401
        
    if user.status == 'suspended':
        return jsonify({'message': 'Your account has been suspended. Contact support.'}), 403
        
    # Generate JWT
    access_token = create_access_token(identity=str(user.id))
    
    user_data = user.to_dict()
    if user.role == 'ngo' and user.ngo_profile:
        user_data['ngo_profile'] = user.ngo_profile.to_dict()
        
    return jsonify({
        'token': access_token,
        'user': user_data
    }), 200

@auth_bp.route('/profile', methods=['GET'])
@jwt_required()
def profile():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({'message': 'User not found'}), 444
        
    user_data = user.to_dict()
    if user.role == 'ngo' and user.ngo_profile:
        user_data['ngo_profile'] = user.ngo_profile.to_dict()
        
    return jsonify(user_data), 200
