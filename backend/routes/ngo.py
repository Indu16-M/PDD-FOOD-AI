import random
import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, User, FoodDonation, DonationRequest, Delivery, Notification

ngo_bp = Blueprint('ngo', __name__)

@ngo_bp.route('/requests', methods=['POST'])
@jwt_required()
def request_food():
    ngo_id = int(get_jwt_identity())
    ngo = User.query.get(ngo_id)
    
    if not ngo or ngo.role != 'ngo':
        return jsonify({'message': 'Unauthorized. Only verified NGOs can request food.'}), 403
        
    if ngo.status != 'active':
        return jsonify({'message': 'Your account is pending verification or suspended.'}), 403
        
    data = request.get_json() or {}
    donation_id = data.get('donation_id')
    
    if not donation_id:
        return jsonify({'message': 'Missing donation_id'}), 400
        
    donation = FoodDonation.query.get_or_404(donation_id)
    
    if donation.status != 'available':
        return jsonify({'message': 'This donation is no longer available.'}), 400
        
    # Check if NGO already requested this item
    existing = DonationRequest.query.filter_by(donation_id=donation_id, ngo_id=ngo_id).first()
    if existing:
        return jsonify({'message': 'You have already requested this donation.'}), 400
        
    req = DonationRequest(
        donation_id=donation_id,
        ngo_id=ngo_id,
        status='pending'
    )
    
    # Notify Donor
    notif = Notification(
        user_id=donation.donor_id,
        type='request_received',
        title='Food Requested',
        message=f"NGO '{ngo.username}' has requested your donation: {donation.title}."
    )
    
    try:
        db.session.add(req)
        db.session.add(notif)
        db.session.commit()
        return jsonify({
            'message': 'Donation request submitted successfully',
            'request': req.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f"Request failed: {str(e)}"}), 500

@ngo_bp.route('/requests', methods=['GET'])
@jwt_required()
def get_requests():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({'message': 'User not found'}), 404
        
    if user.role == 'ngo':
        # NGO requests they made
        reqs = DonationRequest.query.filter_by(ngo_id=user_id).order_by(DonationRequest.requested_at.desc()).all()
    elif user.role == 'donor':
        # Requests donors received on their donations
        reqs = DonationRequest.query.join(FoodDonation).filter(FoodDonation.donor_id == user_id).order_by(DonationRequest.requested_at.desc()).all()
    else:
        # Admin gets all
        reqs = DonationRequest.query.order_by(DonationRequest.requested_at.desc()).all()
        
    return jsonify([r.to_dict() for r in reqs]), 200

@ngo_bp.route('/requests/<int:request_id>/approve', methods=['POST'])
@jwt_required()
def approve_request(request_id):
    donor_id = int(get_jwt_identity())
    donor = User.query.get(donor_id)
    
    req = DonationRequest.query.get_or_404(request_id)
    donation = req.donation
    
    if not donor or (donation.donor_id != donor_id and donor.role != 'admin'):
        return jsonify({'message': 'Unauthorized. Only the donor can approve requests.'}), 403
        
    if donation.status != 'available':
        return jsonify({'message': 'Donation is already assigned or completed.'}), 400
        
    # Accept this request
    req.status = 'accepted'
    donation.status = 'accepted'
    
    # Reject all other pending requests for this donation
    other_requests = DonationRequest.query.filter(
        DonationRequest.donation_id == donation.id,
        DonationRequest.id != request_id
    ).all()
    
    for other in other_requests:
        other.status = 'rejected'
        # Notify other NGOs
        notif = Notification(
            user_id=other.ngo_id,
            type='request_update',
            title='Request Declined',
            message=f"Your request for donation '{donation.title}' was declined. Food was assigned to another NGO."
        )
        db.session.add(notif)
        
    # Create Delivery record
    vcode = f"VRFY-{random.randint(1000, 9999)}"
    delivery = Delivery(
        donation_id=donation.id,
        request_id=req.id,
        ngo_id=req.ngo_id,
        tracking_status='assigned',
        verification_code=vcode,
        current_latitude=donation.donor.latitude if donation.donor else 0.0,
        current_longitude=donation.donor.longitude if donation.donor else 0.0
    )
    db.session.add(delivery)
    
    # Notify NGO
    ngo_notif = Notification(
        user_id=req.ngo_id,
        type='request_update',
        title='Request Approved!',
        message=f"Your request for donation '{donation.title}' has been approved! Ready for pickup. Verification Code: {vcode}."
    )
    db.session.add(ngo_notif)
    
    try:
        db.session.commit()
        return jsonify({
            'message': 'Donation request approved. Delivery process initiated.',
            'request': req.to_dict(),
            'delivery': delivery.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f"Approval failed: {str(e)}"}), 500

@ngo_bp.route('/deliveries', methods=['GET'])
@jwt_required()
def get_deliveries():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({'message': 'User not found'}), 404
        
    if user.role == 'ngo':
        deliveries = Delivery.query.filter_by(ngo_id=user_id).order_by(Delivery.started_at.desc()).all()
    elif user.role == 'donor':
        deliveries = Delivery.query.join(FoodDonation).filter(FoodDonation.donor_id == user_id).order_by(Delivery.started_at.desc()).all()
    else:
        deliveries = Delivery.query.order_by(Delivery.started_at.desc()).all()
        
    return jsonify([d.to_dict() for d in deliveries]), 200

@ngo_bp.route('/deliveries/<int:delivery_id>', methods=['PATCH'])
@jwt_required()
def update_delivery(delivery_id):
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    delivery = Delivery.query.get_or_404(delivery_id)
    donation = delivery.donation
    
    data = request.get_json() or {}
    new_status = data.get('tracking_status') # 'picked_up', 'in_transit', 'delivered'
    volunteer_name = data.get('volunteer_name')
    volunteer_phone = data.get('volunteer_phone')
    verify_code = data.get('verification_code')
    
    if not new_status:
        return jsonify({'message': 'Missing tracking_status'}), 400
        
    # Authorization checks
    is_ngo = (delivery.ngo_id == user_id)
    is_donor = (donation.donor_id == user_id)
    is_admin = (user.role == 'admin')
    
    if not (is_ngo or is_donor or is_admin):
        return jsonify({'message': 'Unauthorized to edit this delivery details'}), 403
        
    if volunteer_name:
        delivery.volunteer_name = volunteer_name
    if volunteer_phone:
        delivery.volunteer_phone = volunteer_phone
        
    if new_status == 'delivered':
        # Delivery completion requires verification code matching
        if not verify_code:
            return jsonify({'message': 'Verification code required to complete delivery.'}), 400
            
        if verify_code.strip().upper() != delivery.verification_code.strip().upper():
            return jsonify({'message': 'Invalid verification code. Please check with the NGO.'}), 400
            
        delivery.tracking_status = 'delivered'
        delivery.completed_at = datetime.datetime.utcnow()
        donation.status = 'completed'
        
        # Notify donor and NGO
        notif_d = Notification(
            user_id=donation.donor_id,
            type='delivery_update',
            title='Donation Completed',
            message=f"Your donation '{donation.title}' was successfully delivered to NGO."
        )
        db.session.add(notif_d)
    else:
        # Standard update
        delivery.tracking_status = new_status
        if new_status == 'picked_up':
            donation.status = 'picked_up'
        elif new_status == 'in_transit':
            donation.status = 'delivered' # Map to delivery in progress
            
    try:
        db.session.commit()
        return jsonify({
            'message': f"Delivery status updated to {new_status}",
            'delivery': delivery.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f"Failed to update delivery: {str(e)}"}), 500

@ngo_bp.route('/deliveries/<int:delivery_id>/location', methods=['PATCH'])
@jwt_required()
def update_delivery_location(delivery_id):
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    delivery = Delivery.query.get_or_404(delivery_id)
    
    is_ngo = (delivery.ngo_id == user_id)
    is_donor = (delivery.donation.donor_id == user_id if delivery.donation else False)
    is_admin = (user.role == 'admin')
    
    if not (is_ngo or is_donor or is_admin):
        return jsonify({'message': 'Unauthorized to update delivery location'}), 403
        
    data = request.get_json() or {}
    latitude = data.get('latitude')
    longitude = data.get('longitude')
    
    if latitude is None or longitude is None:
        return jsonify({'message': 'Missing latitude or longitude'}), 400
        
    delivery.current_latitude = float(latitude)
    delivery.current_longitude = float(longitude)
    
    # Auto-transition to in_transit if currently picked_up and location changes
    if delivery.tracking_status == 'picked_up':
        delivery.tracking_status = 'in_transit'
        if delivery.donation:
            delivery.donation.status = 'delivered' # Map to delivery in progress
            
    try:
        db.session.commit()
        return jsonify({
            'message': 'Delivery location updated successfully',
            'delivery': delivery.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f"Failed to update location: {str(e)}"}), 500
