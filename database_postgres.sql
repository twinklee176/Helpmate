-- ====================================================================
-- HelpMate - “Connecting Needs with the Right Help”
-- PostgreSQL Relational Database Schema & Sample Data
-- Software Engineering Lab Project (Sprint 1 - Sprint 6)
-- ====================================================================

-- Drop tables if re-running
DROP TABLE IF EXISTS help_circle_members CASCADE;
DROP TABLE IF EXISTS help_circles CASCADE;
DROP TABLE IF EXISTS disputes_reports CASCADE;
DROP TABLE IF EXISTS resource_items CASCADE;
DROP TABLE IF EXISTS blood_pledges CASCADE;
DROP TABLE IF EXISTS blood_requests CASCADE;
DROP TABLE IF EXISTS volunteer_applications CASCADE;
DROP TABLE IF EXISTS volunteer_opportunities CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS help_offers CASCADE;
DROP TABLE IF EXISTS help_requests CASCADE;
DROP TABLE IF EXISTS ngos CASCADE;
DROP TABLE IF EXISTS user_availability CASCADE;
DROP TABLE IF EXISTS user_skills CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- --------------------------------------------------------------------
-- 1. USERS TABLE (Module 1: User & Profile Management)
-- --------------------------------------------------------------------
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user' CHECK(role IN ('user', 'ngo', 'admin')),
    bio TEXT,
    phone VARCHAR(30),
    avatar VARCHAR(50),
    city VARCHAR(100) DEFAULT 'New Delhi',
    area VARCHAR(150) DEFAULT 'Connaught Place',
    radius_km INT DEFAULT 15,
    share_approx_location SMALLINT DEFAULT 1,
    is_verified SMALLINT DEFAULT 0,
    reliability_score NUMERIC(5, 2) DEFAULT 95.0,
    rating_avg NUMERIC(3, 2) DEFAULT 5.0,
    rating_count INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- --------------------------------------------------------------------
-- 2. USER SKILLS TABLE
-- --------------------------------------------------------------------
CREATE TABLE user_skills (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_name VARCHAR(100) NOT NULL,
    proficiency VARCHAR(30) DEFAULT 'Intermediate' CHECK(proficiency IN ('Beginner', 'Intermediate', 'Expert')),
    experience_years INT DEFAULT 1
);

-- --------------------------------------------------------------------
-- 3. USER AVAILABILITY TABLE
-- --------------------------------------------------------------------
CREATE TABLE user_availability (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    day_of_week VARCHAR(50) NOT NULL,
    time_slot VARCHAR(50) NOT NULL,
    preferred_duration VARCHAR(50) DEFAULT '1-2 hours'
);

-- --------------------------------------------------------------------
-- 4. NGOS TABLE (Module 4: NGO & Volunteering)
-- --------------------------------------------------------------------
CREATE TABLE ngos (
    id SERIAL PRIMARY KEY,
    user_id INT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    org_name VARCHAR(200) NOT NULL,
    reg_number VARCHAR(100) NOT NULL,
    mission TEXT,
    website VARCHAR(255),
    contact_person VARCHAR(150),
    verification_status VARCHAR(30) DEFAULT 'pending' CHECK(verification_status IN ('pending', 'verified', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- --------------------------------------------------------------------
-- 5. HELP REQUESTS TABLE (Module 2 & 3: 5 Major Assistance Sectors)
-- --------------------------------------------------------------------
CREATE TABLE help_requests (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    sector VARCHAR(60) NOT NULL CHECK(sector IN (
        'Education & Skill Development',
        'Personal & Daily-Life Assistance',
        'Community Assistance',
        'NGO & Volunteering',
        'Donation & Resource Assistance'
    )),
    required_skills TEXT,
    urgency VARCHAR(30) DEFAULT 'Normal' CHECK(urgency IN ('Normal', 'Urgent', 'Critical')),
    date_time VARCHAR(100),
    duration VARCHAR(50),
    city VARCHAR(100) NOT NULL,
    area VARCHAR(150) NOT NULL,
    is_remote SMALLINT DEFAULT 0,
    helpers_needed INT DEFAULT 1,
    status VARCHAR(30) DEFAULT 'Open' CHECK(status IN ('Draft', 'Open', 'Accepted', 'In Progress', 'Completed', 'Cancelled', 'Expired')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE
);

-- --------------------------------------------------------------------
-- 6. HELP OFFERS TABLE (Multi-Factor Matching & Helper Selection)
-- --------------------------------------------------------------------
CREATE TABLE help_offers (
    id SERIAL PRIMARY KEY,
    request_id INT NOT NULL REFERENCES help_requests(id) ON DELETE CASCADE,
    helper_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT,
    match_score INT DEFAULT 0,
    match_reasons TEXT,
    status VARCHAR(30) DEFAULT 'Pending' CHECK(status IN ('Pending', 'Accepted', 'Declined', 'Completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- --------------------------------------------------------------------
-- 7. REVIEWS & RATINGS TABLE (Module 5: Trust & Reputation)
-- --------------------------------------------------------------------
CREATE TABLE reviews (
    id SERIAL PRIMARY KEY,
    request_id INT NOT NULL REFERENCES help_requests(id) ON DELETE CASCADE,
    reviewer_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reviewee_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating INT NOT NULL CHECK(rating >= 1 AND rating <= 5),
    feedback TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- --------------------------------------------------------------------
-- 8. IN-APP MESSAGES TABLE (Module 5: Communication)
-- --------------------------------------------------------------------
CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    request_id INT REFERENCES help_requests(id) ON DELETE CASCADE,
    sender_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id INT REFERENCES users(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- --------------------------------------------------------------------
-- 9. NOTIFICATIONS TABLE
-- --------------------------------------------------------------------
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    link VARCHAR(255),
    is_read SMALLINT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- --------------------------------------------------------------------
-- 10. VOLUNTEER OPPORTUNITIES TABLE (NGO Driven)
-- --------------------------------------------------------------------
CREATE TABLE volunteer_opportunities (
    id SERIAL PRIMARY KEY,
    ngo_id INT NOT NULL REFERENCES ngos(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    skills_required TEXT,
    schedule VARCHAR(100),
    city VARCHAR(100) NOT NULL,
    area VARCHAR(150) NOT NULL,
    volunteers_needed INT DEFAULT 5,
    volunteers_registered INT DEFAULT 0,
    status VARCHAR(30) DEFAULT 'Open' CHECK(status IN ('Open', 'In Progress', 'Completed', 'Closed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- --------------------------------------------------------------------
-- 11. VOLUNTEER APPLICATIONS TABLE
-- --------------------------------------------------------------------
CREATE TABLE volunteer_applications (
    id SERIAL PRIMARY KEY,
    opportunity_id INT NOT NULL REFERENCES volunteer_opportunities(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    note TEXT,
    status VARCHAR(30) DEFAULT 'Applied' CHECK(status IN ('Applied', 'Approved', 'Rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- --------------------------------------------------------------------
-- 12. BLOOD DONATION REQUESTS (Urgent Community Lifeline)
-- --------------------------------------------------------------------
CREATE TABLE blood_requests (
    id SERIAL PRIMARY KEY,
    requester_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    patient_name VARCHAR(150) NOT NULL,
    blood_group VARCHAR(10) NOT NULL CHECK(blood_group IN ('A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-')),
    units_needed INT DEFAULT 1,
    hospital_name VARCHAR(200) NOT NULL,
    city VARCHAR(100) NOT NULL,
    area VARCHAR(150) NOT NULL,
    urgency VARCHAR(50) DEFAULT 'Urgent' CHECK(urgency IN ('Immediate / Critical', 'Within 24 Hours', 'Scheduled')),
    contact_phone VARCHAR(30) NOT NULL,
    status VARCHAR(30) DEFAULT 'Open' CHECK(status IN ('Open', 'Fulfilled', 'Closed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- --------------------------------------------------------------------
-- 13. BLOOD PLEDGES TABLE
-- --------------------------------------------------------------------
CREATE TABLE blood_pledges (
    id SERIAL PRIMARY KEY,
    blood_request_id INT NOT NULL REFERENCES blood_requests(id) ON DELETE CASCADE,
    donor_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    note TEXT,
    status VARCHAR(30) DEFAULT 'Pledged' CHECK(status IN ('Pledged', 'Donated', 'Cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- --------------------------------------------------------------------
-- 14. RESOURCE & GOODS DONATION (Request or Offer)
-- --------------------------------------------------------------------
CREATE TABLE resource_items (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK(type IN ('Offer', 'Need')),
    category VARCHAR(60) NOT NULL CHECK(category IN ('Study Materials & Books', 'Food & Meals', 'Clothing & Blankets', 'Medical & Mobility Aids', 'Electronics & Tools')),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    item_condition VARCHAR(30) DEFAULT 'Good' CHECK(item_condition IN ('New', 'Like New', 'Good', 'Fair')),
    quantity VARCHAR(50) DEFAULT '1',
    city VARCHAR(100) NOT NULL,
    area VARCHAR(150) NOT NULL,
    status VARCHAR(30) DEFAULT 'Available' CHECK(status IN ('Available', 'Claimed', 'Completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- --------------------------------------------------------------------
-- 15. DISPUTES & REPORTS TABLE (Trust & Safety Moderation)
-- --------------------------------------------------------------------
CREATE TABLE disputes_reports (
    id SERIAL PRIMARY KEY,
    reporter_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reported_user_id INT REFERENCES users(id) ON DELETE SET NULL,
    request_id INT REFERENCES help_requests(id) ON DELETE SET NULL,
    category VARCHAR(60) NOT NULL CHECK(category IN ('No Show / Cancellation', 'Inappropriate Behavior', 'Misleading Information', 'Spam / Commercial Request', 'Safety Violation')),
    details TEXT NOT NULL,
    status VARCHAR(30) DEFAULT 'Pending' CHECK(status IN ('Pending', 'Investigating', 'Resolved', 'Dismissed')),
    admin_resolution TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- --------------------------------------------------------------------
-- 16. HELP CIRCLES TABLE (Multi-Helper Collaboration)
-- --------------------------------------------------------------------
CREATE TABLE help_circles (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    request_id INT REFERENCES help_requests(id) ON DELETE SET NULL,
    lead_user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(30) DEFAULT 'Active' CHECK(status IN ('Active', 'Completed', 'Archived')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE help_circle_members (
    id SERIAL PRIMARY KEY,
    circle_id INT NOT NULL REFERENCES help_circles(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'Volunteer',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Indexes for performance
CREATE INDEX idx_help_requests_sector ON help_requests(sector);
CREATE INDEX idx_help_requests_status ON help_requests(status);
CREATE INDEX idx_help_requests_city ON help_requests(city);
CREATE INDEX idx_user_skills_user ON user_skills(user_id);
CREATE INDEX idx_blood_requests_group ON blood_requests(blood_group, status);
