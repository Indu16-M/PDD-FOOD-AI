-- Database Seed Data (MySQL Compatible)
USE food_sharing_db;

-- 1. Insert Users (Password is bcrypt hash for 'password123')
-- Admin User
INSERT INTO users (id, username, email, password_hash, role, latitude, longitude, address, phone, status)
VALUES (1, 'admin_user', 'admin@foodshare.org', '$2b$12$KkQ0Jp07ZkI08jI5gA7gEONjH5g79c1H4Qv6vK19qN8H3lH2y93rG', 'admin', 12.971598, 77.594562, 'Central Admin Center, Bengaluru, Karnataka', '+91 9999999999', 'active');

-- Donor Users
INSERT INTO users (id, username, email, password_hash, role, latitude, longitude, address, phone, status)
VALUES (2, 'grand_hotel', 'donations@grandhotel.com', '$2b$12$KkQ0Jp07ZkI08jI5gA7gEONjH5g79c1H4Qv6vK19qN8H3lH2y93rG', 'donor', 12.9784, 77.6408, 'Grand Hotel, Indiranagar, Bengaluru, Karnataka', '+91 9888888881', 'active');

INSERT INTO users (id, username, email, password_hash, role, latitude, longitude, address, phone, status)
VALUES (3, 'supermart_fresh', 'waste_mgmt@freshmart.com', '$2b$12$KkQ0Jp07ZkI08jI5gA7gEONjH5g79c1H4Qv6vK19qN8H3lH2y93rG', 'donor', 12.9345, 77.6101, 'FreshMart Supermarket, Koramangala, Bengaluru, Karnataka', '+91 9888888882', 'active');

INSERT INTO users (id, username, email, password_hash, role, latitude, longitude, address, phone, status)
VALUES (4, 'anna_kitchen', 'annakitchen@gmail.com', '$2b$12$KkQ0Jp07ZkI08jI5gA7gEONjH5g79c1H4Qv6vK19qN8H3lH2y93rG', 'donor', 12.9698, 77.7499, 'Anna Kitchen, Whitefield, Bengaluru, Karnataka', '+91 9888888883', 'active');

-- NGO Users
INSERT INTO users (id, username, email, password_hash, role, latitude, longitude, address, phone, status)
VALUES (5, 'feed_the_hungry', 'contact@feedhungry.org', '$2b$12$KkQ0Jp07ZkI08jI5gA7gEONjH5g79c1H4Qv6vK19qN8H3lH2y93rG', 'ngo', 12.9756, 77.6012, 'Feed The Hungry NGO Office, MG Road, Bengaluru, Karnataka', '+91 9777777771', 'active');

INSERT INTO users (id, username, email, password_hash, role, latitude, longitude, address, phone, status)
VALUES (6, 'care_foundation', 'info@carefoundation.org', '$2b$12$KkQ0Jp07ZkI08jI5gA7gEONjH5g79c1H4Qv6vK19qN8H3lH2y93rG', 'ngo', 12.9279, 77.6244, 'Care Foundation Shelter, HSR Layout, Bengaluru, Karnataka', '+91 9777777772', 'active');

INSERT INTO users (id, username, email, password_hash, role, latitude, longitude, address, phone, status)
VALUES (7, 'hope_kitchen_ngo', 'hopekitchen@ngo.org', '$2b$12$KkQ0Jp07ZkI08jI5gA7gEONjH5g79c1H4Qv6vK19qN8H3lH2y93rG', 'ngo', 12.9904, 77.5312, 'Hope Kitchen, Rajajinagar, Bengaluru, Karnataka', '+91 9777777773', 'pending_approval');


-- 2. Insert NGO Profiles
INSERT INTO ngo_profiles (user_id, organization_name, registration_number, tax_id, capacity_people, preferred_food_types, verified, website)
VALUES (5, 'Feed The Hungry India', 'REG-102938475', 'TAX-FEED-12345', 250, 'cooked,bakery,produce,packaged,dry', TRUE, 'https://feedhungry.org');

INSERT INTO ngo_profiles (user_id, organization_name, registration_number, tax_id, capacity_people, preferred_food_types, verified, website)
VALUES (6, 'Care Foundation Bengaluru', 'REG-564738291', 'TAX-CARE-98765', 150, 'cooked,dairy,produce,dry', TRUE, 'https://carefoundation.org');

INSERT INTO ngo_profiles (user_id, organization_name, registration_number, tax_id, capacity_people, preferred_food_types, verified, website)
VALUES (7, 'Hope Kitchen Foundation', 'REG-839201948', 'TAX-HOPE-45612', 100, 'cooked,bakery,packaged', FALSE, 'https://hopekitchen.org');


-- 3. Insert Sample Food Donations
-- Active Available
INSERT INTO food_donations (id, donor_id, title, description, food_type, quantity, quantity_unit, storage_condition, temperature_celsius, prep_time, estimated_expiry, remaining_shelf_life_hours, risk_level, status, image_url, qr_code_data)
VALUES (1, 2, 'Vegetable Biryani', '10 portions of hot vegetable biryani and raita. Kept warm.', 'cooked', 5.0, 'kg', 'ambient', 45.0, DATE_SUB(NOW(), INTERVAL 2 HOUR), DATE_ADD(NOW(), INTERVAL 4 HOUR), 4.0, 'Medium Risk', 'available', '', 'QR_DONATION_1_HASH');

INSERT INTO food_donations (id, donor_id, title, description, food_type, quantity, quantity_unit, storage_condition, temperature_celsius, prep_time, estimated_expiry, remaining_shelf_life_hours, risk_level, status, image_url, qr_code_data)
VALUES (2, 3, 'Fresh Milk Cartons', '50 tetra packs of pasteurized whole milk, unopened.', 'dairy', 50.0, 'L', 'refrigerated', 4.0, DATE_SUB(NOW(), INTERVAL 24 HOUR), DATE_ADD(NOW(), INTERVAL 72 HOUR), 72.0, 'Safe', 'available', '', 'QR_DONATION_2_HASH');

INSERT INTO food_donations (id, donor_id, title, description, food_type, quantity, quantity_unit, storage_condition, temperature_celsius, prep_time, estimated_expiry, remaining_shelf_life_hours, risk_level, status, image_url, qr_code_data)
VALUES (3, 4, 'Raw Chicken Breasts', '20kg frozen chicken breasts. Packed in vacuum bags.', 'raw_meat', 20.0, 'kg', 'frozen', -18.0, DATE_SUB(NOW(), INTERVAL 12 HOUR), DATE_ADD(NOW(), INTERVAL 120 HOUR), 120.0, 'Safe', 'available', '', 'QR_DONATION_3_HASH');

-- Completed / History
INSERT INTO food_donations (id, donor_id, title, description, food_type, quantity, quantity_unit, storage_condition, temperature_celsius, prep_time, estimated_expiry, remaining_shelf_life_hours, risk_level, status, image_url, qr_code_data)
VALUES (4, 2, 'Assorted Bread Roll Tray', 'Assorted fresh baked bread rolls from the morning buffet.', 'bakery', 3.0, 'kg', 'ambient', 22.0, DATE_SUB(NOW(), INTERVAL 26 HOUR), DATE_SUB(NOW(), INTERVAL 2 HOUR), 0.0, 'High Risk', 'completed', '', 'QR_DONATION_4_HASH');

-- 4. Donation Requests
INSERT INTO donation_requests (id, donation_id, ngo_id, status)
VALUES (1, 4, 5, 'accepted');


-- 5. Deliveries
INSERT INTO deliveries (id, donation_id, request_id, ngo_id, volunteer_name, volunteer_phone, tracking_status, verification_code, started_at, completed_at)
VALUES (1, 4, 1, 5, 'Ramesh Kumar', '+91 9666666661', 'delivered', 'VRFY-4091', DATE_SUB(NOW(), INTERVAL 3 HOUR), DATE_SUB(NOW(), INTERVAL 2 HOUR));


-- 6. Notifications
INSERT INTO notifications (user_id, type, title, message)
VALUES (5, 'new_donation', 'New Food Available Nearby', 'Grand Hotel has posted a donation: Vegetable Biryani (5.0 kg)');

INSERT INTO notifications (user_id, type, title, message)
VALUES (2, 'request_received', 'Food Donation Requested', 'Feed The Hungry has requested your Vegetable Biryani donation.');


-- 7. Analytics Snapshots
INSERT INTO analytics_snapshots (date, total_donations, total_waste_saved_kg, active_ngos, active_donors)
VALUES (DATE_SUB(CURRENT_DATE, INTERVAL 4 DAY), 5, 25.5, 2, 2);

INSERT INTO analytics_snapshots (date, total_donations, total_waste_saved_kg, active_ngos, active_donors)
VALUES (DATE_SUB(CURRENT_DATE, INTERVAL 3 DAY), 7, 43.0, 2, 2);

INSERT INTO analytics_snapshots (date, total_donations, total_waste_saved_kg, active_ngos, active_donors)
VALUES (DATE_SUB(CURRENT_DATE, INTERVAL 2 DAY), 12, 68.2, 2, 3);

INSERT INTO analytics_snapshots (date, total_donations, total_waste_saved_kg, active_ngos, active_donors)
VALUES (DATE_SUB(CURRENT_DATE, INTERVAL 1 DAY), 18, 110.0, 3, 3);
