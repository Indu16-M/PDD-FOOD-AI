from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, Notification

notifications_bp = Blueprint('notifications', __name__)

@notifications_bp.route('', methods=['GET'])
@jwt_required()
def get_notifications():
    user_id = int(get_jwt_identity())
    notifications = Notification.query.filter_by(user_id=user_id).order_by(Notification.created_at.desc()).all()
    return jsonify([n.to_dict() for n in notifications]), 200

@notifications_bp.route('/<int:notification_id>/read', methods=['PATCH'])
@jwt_required()
def mark_as_read(notification_id):
    user_id = int(get_jwt_identity())
    notification = Notification.query.filter_by(id=notification_id, user_id=user_id).first_or_404()
    
    notification.is_read = True
    try:
        db.session.commit()
        return jsonify({'message': 'Notification marked as read', 'notification': notification.to_dict()}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f"Failed to update notification: {str(e)}"}), 500

@notifications_bp.route('/read-all', methods=['POST'])
@jwt_required()
def mark_all_read():
    user_id = int(get_jwt_identity())
    notifications = Notification.query.filter_by(user_id=user_id, is_read=False).all()
    
    for n in notifications:
        n.is_read = True
        
    try:
        db.session.commit()
        return jsonify({'message': 'All notifications marked as read'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f"Failed to mark all as read: {str(e)}"}), 500
