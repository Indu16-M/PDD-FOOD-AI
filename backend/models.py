import datetime
import bcrypt
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), unique=True, nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False)  # 'donor', 'ngo', 'admin'
    latitude = db.Column(db.Float, default=0.0)
    longitude = db.Column(db.Float, default=0.0)
    address = db.Column(db.String(255), default='')
    phone = db.Column(db.String(20), default='')
    status = db.Column(db.String(20), default='active')  # 'active', 'pending_approval', 'suspended'
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    
    # Relationships
    ngo_profile = db.relationship('NgoProfile', backref='user', uselist=False, cascade="all, delete-orphan")
    donations = db.relationship('FoodDonation', backref='donor', lazy=True, cascade="all, delete-orphan")
    requests = db.relationship('DonationRequest', backref='ngo', lazy=True, cascade="all, delete-orphan")
    notifications = db.relationship('Notification', backref='user', lazy=True, cascade="all, delete-orphan")
    
    def set_password(self, password):
        salt = bcrypt.gensalt()
        self.password_hash = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
        
    def check_password(self, password):
        return bcrypt.checkpw(password.encode('utf-8'), self.password_hash.encode('utf-8'))
        
    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'role': self.role,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'address': self.address,
            'phone': self.phone,
            'status': self.status,
            'created_at': self.created_at.isoformat()
        }

class NgoProfile(db.Model):
    __tablename__ = 'ngo_profiles'
    
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), primary_key=True)
    organization_name = db.Column(db.String(150), nullable=False)
    registration_number = db.Column(db.String(100), nullable=False)
    tax_id = db.Column(db.String(50), default='')
    capacity_people = db.Column(db.Integer, default=0)
    preferred_food_types = db.Column(db.String(255), default='all')  # comma-separated
    verified = db.Column(db.Boolean, default=False)
    website = db.Column(db.String(255), default='')
    
    def to_dict(self):
        return {
            'user_id': self.user_id,
            'organization_name': self.organization_name,
            'registration_number': self.registration_number,
            'tax_id': self.tax_id,
            'capacity_people': self.capacity_people,
            'preferred_food_types': self.preferred_food_types,
            'verified': self.verified,
            'website': self.website
        }

class FoodDonation(db.Model):
    __tablename__ = 'food_donations'
    
    id = db.Column(db.Integer, primary_key=True)
    donor_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    title = db.Column(db.String(150), nullable=False)
    description = db.Column(db.Text)
    food_type = db.Column(db.String(30), nullable=False)  # 'cooked', 'raw_meat', 'dairy', etc.
    quantity = db.Column(db.Float, nullable=False)
    quantity_unit = db.Column(db.String(20), default='kg')
    storage_condition = db.Column(db.String(30), nullable=False)  # 'ambient', 'refrigerated', 'frozen'
    temperature_celsius = db.Column(db.Float, nullable=False)
    prep_time = db.Column(db.DateTime, nullable=False)
    estimated_expiry = db.Column(db.DateTime)
    remaining_shelf_life_hours = db.Column(db.Float, default=0.0)
    risk_level = db.Column(db.String(20), default='Safe')  # 'Safe', 'Medium Risk', 'High Risk'
    status = db.Column(db.String(20), default='available')  # 'available', 'requested', 'accepted', 'picked_up', 'delivered', 'completed', 'expired'
    image_url = db.Column(db.String(255), default='')
    qr_code_data = db.Column(db.String(255), default='')
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    
    # Relationships
    requests = db.relationship('DonationRequest', backref='donation', lazy=True, cascade="all, delete-orphan")
    deliveries = db.relationship('Delivery', backref='donation', lazy=True, cascade="all, delete-orphan")
    
    def to_dict(self):
        return {
            'id': self.id,
            'donor_id': self.donor_id,
            'donor_name': self.donor.username if self.donor else 'Unknown',
            'donor_phone': self.donor.phone if self.donor else '',
            'donor_address': self.donor.address if self.donor else '',
            'donor_latitude': self.donor.latitude if self.donor else 0.0,
            'donor_longitude': self.donor.longitude if self.donor else 0.0,
            'title': self.title,
            'description': self.description,
            'food_type': self.food_type,
            'quantity': self.quantity,
            'quantity_unit': self.quantity_unit,
            'storage_condition': self.storage_condition,
            'temperature_celsius': self.temperature_celsius,
            'prep_time': self.prep_time.isoformat(),
            'estimated_expiry': self.estimated_expiry.isoformat() if self.estimated_expiry else None,
            'remaining_shelf_life_hours': self.remaining_shelf_life_hours,
            'risk_level': self.risk_level,
            'status': self.status,
            'image_url': self.image_url,
            'qr_code_data': self.qr_code_data,
            'created_at': self.created_at.isoformat(),
            'requests': [req.to_dict() for req in self.requests] if self.requests else []
        }

class DonationRequest(db.Model):
    __tablename__ = 'donation_requests'
    
    id = db.Column(db.Integer, primary_key=True)
    donation_id = db.Column(db.Integer, db.ForeignKey('food_donations.id', ondelete='CASCADE'), nullable=False)
    ngo_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    status = db.Column(db.String(20), default='pending')  # 'pending', 'accepted', 'rejected', 'cancelled'
    requested_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    deliveries = db.relationship('Delivery', backref='request', lazy=True, cascade="all, delete-orphan")
    
    def to_dict(self):
        return {
            'id': self.id,
            'donation_id': self.donation_id,
            'donation_title': self.donation.title if self.donation else 'Deleted Donation',
            'donor_name': self.donation.donor.username if self.donation and self.donation.donor else '',
            'ngo_id': self.ngo_id,
            'ngo_name': self.ngo.username if self.ngo else 'Unknown NGO',
            'status': self.status,
            'requested_at': self.requested_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

class Delivery(db.Model):
    __tablename__ = 'deliveries'
    
    id = db.Column(db.Integer, primary_key=True)
    donation_id = db.Column(db.Integer, db.ForeignKey('food_donations.id', ondelete='CASCADE'), nullable=False)
    request_id = db.Column(db.Integer, db.ForeignKey('donation_requests.id', ondelete='CASCADE'), nullable=False)
    ngo_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    volunteer_name = db.Column(db.String(100), default='')
    volunteer_phone = db.Column(db.String(20), default='')
    tracking_status = db.Column(db.String(20), default='assigned')  # 'assigned', 'picked_up', 'in_transit', 'delivered'
    verification_code = db.Column(db.String(10), default='')
    current_latitude = db.Column(db.Float, nullable=True)
    current_longitude = db.Column(db.Float, nullable=True)
    started_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    completed_at = db.Column(db.DateTime, nullable=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'donation_id': self.donation_id,
            'donation_title': self.donation.title if self.donation else 'Deleted Donation',
            'request_id': self.request_id,
            'ngo_id': self.ngo_id,
            'ngo_name': self.request.ngo.username if (self.request and self.request.ngo) else 'Unknown NGO',
            'volunteer_name': self.volunteer_name,
            'volunteer_phone': self.volunteer_phone,
            'tracking_status': self.tracking_status,
            'verification_code': self.verification_code,
            'current_latitude': self.current_latitude,
            'current_longitude': self.current_longitude,
            'donor_latitude': self.donation.donor.latitude if (self.donation and self.donation.donor) else 0.0,
            'donor_longitude': self.donation.donor.longitude if (self.donation and self.donation.donor) else 0.0,
            'donor_address': self.donation.donor.address if (self.donation and self.donation.donor) else '',
            'ngo_latitude': self.request.ngo.latitude if (self.request and self.request.ngo) else 0.0,
            'ngo_longitude': self.request.ngo.longitude if (self.request and self.request.ngo) else 0.0,
            'ngo_address': self.request.ngo.address if (self.request and self.request.ngo) else '',
            'started_at': self.started_at.isoformat(),
            'completed_at': self.completed_at.isoformat() if self.completed_at else None
        }


class ChatMessage(db.Model):
    __tablename__ = 'chat_messages'
    
    id = db.Column(db.Integer, primary_key=True)
    sender_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    receiver_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    donation_id = db.Column(db.Integer, db.ForeignKey('food_donations.id', ondelete='CASCADE'), nullable=False)
    message = db.Column(db.Text, nullable=False)
    sent_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    
    sender = db.relationship('User', foreign_keys=[sender_id])
    receiver = db.relationship('User', foreign_keys=[receiver_id])
    donation = db.relationship('FoodDonation', foreign_keys=[donation_id])
    
    def to_dict(self):
        return {
            'id': self.id,
            'sender_id': self.sender_id,
            'sender_name': self.sender.username if self.sender else 'Deleted User',
            'receiver_id': self.receiver_id,
            'receiver_name': self.receiver.username if self.receiver else 'Deleted User',
            'donation_id': self.donation_id,
            'donation_title': self.donation.title if self.donation else 'Deleted Donation',
            'message': self.message,
            'sent_at': self.sent_at.isoformat()
        }

class Notification(db.Model):
    __tablename__ = 'notifications'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    type = db.Column(db.String(50), nullable=False)  # 'expiry_warning', 'new_donation', 'request_received', etc.
    title = db.Column(db.String(150), nullable=False)
    message = db.Column(db.Text, nullable=False)
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'type': self.type,
            'title': self.title,
            'message': self.message,
            'is_read': self.is_read,
            'created_at': self.created_at.isoformat()
        }

class AnalyticsSnapshot(db.Model):
    __tablename__ = 'analytics_snapshots'
    
    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.Date, unique=True, nullable=False)
    total_donations = db.Column(db.Integer, default=0)
    total_waste_saved_kg = db.Column(db.Float, default=0.0)
    active_ngos = db.Column(db.Integer, default=0)
    active_donors = db.Column(db.Integer, default=0)
    
    def to_dict(self):
        return {
            'id': self.id,
            'date': self.date.isoformat(),
            'total_donations': self.total_donations,
            'total_waste_saved_kg': self.total_waste_saved_kg,
            'active_ngos': self.active_ngos,
            'active_donors': self.active_donors
        }
