import os
import sys
import unittest
import json
import datetime

# Inject backend directory into sys.path
sys.path.append(os.path.join(os.path.dirname(__file__), '../backend'))

from app import create_app, db
from models import User, FoodDonation, DonationRequest, NgoProfile

class FoodSharingAPITestCase(unittest.TestCase):
    
    def setUp(self):
        # Configure test environment
        self.app = create_app()
        self.app.config['TESTING'] = True
        self.app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        self.app.config['JWT_SECRET_KEY'] = 'test-secret-key-12345'
        
        self.client = self.app.test_client()
        
        with self.app.app_context():
            db.create_all()
            
            # Setup mock donor
            self.donor = User(username='test_donor', email='donor@test.org', role='donor', status='active')
            self.donor.set_password('password123')
            
            # Setup mock NGO
            self.ngo = User(username='test_ngo', email='ngo@test.org', role='ngo', status='active')
            self.ngo.set_password('password123')
            
            db.session.add(self.donor)
            db.session.add(self.ngo)
            db.session.commit()
            
            self.ngo_profile = NgoProfile(
                user_id=self.ngo.id,
                organization_name='Test NGO Organization',
                registration_number='REG-1111',
                capacity_people=100,
                preferred_food_types='cooked,dry',
                verified=True
            )
            db.session.add(self.ngo_profile)
            db.session.commit()

    def tearDown(self):
        with self.app.app_context():
            db.session.remove()
            db.close_all_sessions()
            db.drop_all()

    def get_token(self, username, password):
        response = self.client.post('/api/auth/login', json={
            'username': username,
            'password': password
        })
        data = json.loads(response.data.decode('utf-8'))
        return data.get('token')

    def test_user_login(self):
        # Successful login
        response = self.client.post('/api/auth/login', json={
            'username': 'test_donor',
            'password': 'password123'
        })
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data.decode('utf-8'))
        self.assertIn('token', data)
        self.assertEqual(data['user']['username'], 'test_donor')

        # Invalid credentials login
        response = self.client.post('/api/auth/login', json={
            'username': 'test_donor',
            'password': 'wrongpassword'
        })
        self.assertEqual(response.status_code, 401)

    def test_create_donation_and_ai_expiry(self):
        token = self.get_token('test_donor', 'password123')
        headers = {'Authorization': f'Bearer {token}'}
        
        # Post a food donation
        # Simulate form payload since endpoint supports multipart for images
        payload = {
            'title': 'Test Tomato Soup',
            'description': 'Fresh homemade vegetable soup',
            'food_type': 'cooked',
            'quantity': '10.5',
            'quantity_unit': 'portions',
            'storage_condition': 'refrigerated',
            'temperature_celsius': '4.0',
            'prep_time': (datetime.datetime.utcnow() - datetime.timedelta(hours=2)).isoformat()
        }
        
        response = self.client.post('/api/donations', data=payload, headers=headers)
        self.assertEqual(response.status_code, 201)
        data = json.loads(response.data.decode('utf-8'))
        self.assertEqual(data['donation']['title'], 'Test Tomato Soup')
        self.assertIn('remaining_shelf_life_hours', data['donation'])
        self.assertIn('risk_level', data['donation'])
        self.assertIn('qr_code_data', data['donation'])

    def test_manual_ai_prediction_endpoint(self):
        payload = {
            'food_type': 'dairy',
            'storage_condition': 'ambient',
            'temperature_celsius': 32.5,
            'prep_time': datetime.datetime.utcnow().isoformat()
        }
        
        response = self.client.post('/api/ai/predict-expiry', json=payload)
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data.decode('utf-8'))
        self.assertIn('predicted_remaining_shelf_life_hours', data)
        self.assertIn('risk_level', data)
        
        # Dairy at ambient in high heat should result in lower shelf life (High Risk classification)
        self.assertEqual(data['risk_level'], 'High Risk')

    def test_ngo_recommendation_matching_scores(self):
        token = self.get_token('test_donor', 'password123')
        headers = {'Authorization': f'Bearer {token}'}
        
        # 1. Create a donation first
        payload = {
            'title': 'Lentil Soup Surplus',
            'food_type': 'cooked',
            'quantity': '20',
            'storage_condition': 'refrigerated',
            'temperature_celsius': '5.0',
            'prep_time': datetime.datetime.utcnow().isoformat()
        }
        create_res = self.client.post('/api/donations', data=payload, headers=headers)
        don_id = json.loads(create_res.data.decode('utf-8'))['donation']['id']
        
        # 2. Get recommendations
        rec_res = self.client.get(f'/api/ai/recommend-ngos/{don_id}', headers=headers)
        self.assertEqual(rec_res.status_code, 200)
        recs = json.loads(rec_res.data.decode('utf-8'))
        
        # Verify recommended list structure
        self.assertTrue(len(recs) > 0)
        self.assertEqual(recs[0]['organization_name'], 'Test NGO Organization')
        self.assertIn('score', recs[0])
        self.assertIn('distance_km', recs[0])

if __name__ == '__main__':
    unittest.main()
