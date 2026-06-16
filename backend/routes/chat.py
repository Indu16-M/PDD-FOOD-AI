from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, User, ChatMessage, FoodDonation

chat_bp = Blueprint('chat', __name__)

@chat_bp.route('/messages', methods=['POST'])
@jwt_required()
def send_message():
    sender_id = int(get_jwt_identity())
    data = request.get_json() or {}
    
    receiver_id = data.get('receiver_id')
    donation_id = data.get('donation_id')
    message_text = data.get('message')
    
    if not receiver_id or not donation_id or not message_text:
        return jsonify({'message': 'Missing receiver_id, donation_id, or message content'}), 400
        
    # Verify participants
    receiver = User.query.get(receiver_id)
    donation = FoodDonation.query.get(donation_id)
    
    if not receiver or not donation:
        return jsonify({'message': 'Receiver or Donation record not found'}), 404
        
    chat = ChatMessage(
        sender_id=sender_id,
        receiver_id=receiver_id,
        donation_id=donation_id,
        message=message_text
    )
    
    try:
        db.session.add(chat)
        db.session.commit()
        return jsonify(chat.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f"Failed to send message: {str(e)}"}), 500

@chat_bp.route('/messages/<int:donation_id>', methods=['GET'])
@jwt_required()
def get_messages(donation_id):
    user_id = int(get_jwt_identity())
    partner_id = request.args.get('partner_id')
    
    if not partner_id:
        return jsonify({'message': 'Missing partner_id query parameter'}), 400
        
    partner_id = int(partner_id)
    
    # Get all chat messages between current user and partner for this specific donation
    messages = ChatMessage.query.filter(
        ChatMessage.donation_id == donation_id,
        (
            ((ChatMessage.sender_id == user_id) & (ChatMessage.receiver_id == partner_id)) |
            ((ChatMessage.sender_id == partner_id) & (ChatMessage.receiver_id == user_id))
        )
    ).order_by(ChatMessage.sent_at.asc()).all()
    
    return jsonify([m.to_dict() for m in messages]), 200
