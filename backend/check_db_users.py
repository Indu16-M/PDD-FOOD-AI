import os
import sys

# Inject backend directory into sys.path
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from app import create_app
from models import db, User

app = create_app()
with app.app_context():
    print("Listing all registered users in the database:")
    users = User.query.all()
    for u in users:
        test_pw = u.check_password('password123')
        print(f"ID: {u.id} | Username: {u.username} | Role: {u.role} | Status: {u.status} | Password check ('password123'): {test_pw}")
