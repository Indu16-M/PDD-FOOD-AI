-- AI-Driven Food Sharing Platform Database Schema (MySQL Compatible)

CREATE DATABASE IF NOT EXISTS food_sharing_db;
USE food_sharing_db;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('donor', 'ngo', 'admin') NOT NULL,
    latitude DECIMAL(10, 8) DEFAULT 0.0,
    longitude DECIMAL(11, 8) DEFAULT 0.0,
    address VARCHAR(255) DEFAULT '',
    phone VARCHAR(20) DEFAULT '',
    status ENUM('active', 'pending_approval', 'suspended') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- NGO Profiles Table (For NGOs specifically)
CREATE TABLE IF NOT EXISTS ngo_profiles (
    user_id INT PRIMARY KEY,
    organization_name VARCHAR(150) NOT NULL,
    registration_number VARCHAR(100) NOT NULL,
    tax_id VARCHAR(50) DEFAULT '',
    capacity_people INT DEFAULT 0,
    preferred_food_types VARCHAR(255) DEFAULT 'all', -- Comma-separated categories
    verified BOOLEAN DEFAULT FALSE,
    website VARCHAR(255) DEFAULT '',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Food Donations Table
CREATE TABLE IF NOT EXISTS food_donations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    donor_id INT NOT NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    food_type ENUM('cooked', 'raw_meat', 'dairy', 'bakery', 'produce', 'packaged', 'dry') NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL,
    quantity_unit VARCHAR(20) DEFAULT 'kg',
    storage_condition ENUM('ambient', 'refrigerated', 'frozen') NOT NULL,
    temperature_celsius DECIMAL(5, 2) NOT NULL,
    prep_time DATETIME NOT NULL,
    estimated_expiry DATETIME,
    remaining_shelf_life_hours DECIMAL(6, 2) DEFAULT 0.0,
    risk_level ENUM('Safe', 'Medium Risk', 'High Risk') DEFAULT 'Safe',
    status ENUM('available', 'requested', 'accepted', 'picked_up', 'delivered', 'completed', 'expired') DEFAULT 'available',
    image_url VARCHAR(255) DEFAULT '',
    qr_code_data VARCHAR(255) DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (donor_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Donation Requests Table
CREATE TABLE IF NOT EXISTS donation_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    donation_id INT NOT NULL,
    ngo_id INT NOT NULL,
    status ENUM('pending', 'accepted', 'rejected', 'cancelled') DEFAULT 'pending',
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (donation_id) REFERENCES food_donations(id) ON DELETE CASCADE,
    FOREIGN KEY (ngo_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Deliveries Table
CREATE TABLE IF NOT EXISTS deliveries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    donation_id INT NOT NULL,
    request_id INT NOT NULL,
    ngo_id INT NOT NULL,
    volunteer_name VARCHAR(100) DEFAULT '',
    volunteer_phone VARCHAR(20) DEFAULT '',
    tracking_status ENUM('assigned', 'picked_up', 'in_transit', 'delivered') DEFAULT 'assigned',
    verification_code VARCHAR(10) DEFAULT '',
    current_latitude DECIMAL(10, 8) DEFAULT NULL,
    current_longitude DECIMAL(11, 8) DEFAULT NULL,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME DEFAULT NULL,
    FOREIGN KEY (donation_id) REFERENCES food_donations(id) ON DELETE CASCADE,
    FOREIGN KEY (request_id) REFERENCES donation_requests(id) ON DELETE CASCADE,
    FOREIGN KEY (ngo_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Chat Messages Table
CREATE TABLE IF NOT EXISTS chat_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sender_id INT NOT NULL,
    receiver_id INT NOT NULL,
    donation_id INT NOT NULL,
    message TEXT NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (donation_id) REFERENCES food_donations(id) ON DELETE CASCADE
);

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'expiry_warning', 'new_donation', 'request_received', etc.
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Analytics Snapshots Table (For system dashboard historical insights)
CREATE TABLE IF NOT EXISTS analytics_snapshots (
    id INT AUTO_INCREMENT PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    total_donations INT DEFAULT 0,
    total_waste_saved_kg DECIMAL(12, 2) DEFAULT 0.0,
    active_ngos INT DEFAULT 0,
    active_donors INT DEFAULT 0
);
