/**
 * HelpMate - Community Assistance Platform
 * Database Layer (node:sqlite with automatic schema creation and realistic seed data)
 */

const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const crypto = require('node:crypto');

const dbPath = path.join(__dirname, 'helpmate.sqlite');
const db = new DatabaseSync(dbPath);

// Enable foreign keys and WAL mode for reliability
db.exec('PRAGMA foreign_keys = ON;');

// Password hashing utility using PBKDF2
function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, originalHash] = storedHash.split(':');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return hash === originalHash;
}

function initDatabase() {
  db.exec(`
    -- Users Table
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'user' CHECK(role IN ('user', 'ngo', 'admin')),
      bio TEXT,
      phone TEXT,
      avatar TEXT,
      city TEXT DEFAULT 'New Delhi',
      area TEXT DEFAULT 'Connaught Place',
      radius_km INTEGER DEFAULT 15,
      share_approx_location INTEGER DEFAULT 1,
      is_verified INTEGER DEFAULT 0,
      reliability_score REAL DEFAULT 95.0,
      rating_avg REAL DEFAULT 5.0,
      rating_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- User Skills
    CREATE TABLE IF NOT EXISTS user_skills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      skill_name TEXT NOT NULL,
      proficiency TEXT DEFAULT 'Intermediate' CHECK(proficiency IN ('Beginner', 'Intermediate', 'Expert')),
      experience_years INTEGER DEFAULT 1,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- User Availability
    CREATE TABLE IF NOT EXISTS user_availability (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      day_of_week TEXT NOT NULL, -- e.g. 'Monday', 'Saturday', 'All Weekdays', 'Weekends'
      time_slot TEXT NOT NULL,   -- 'Morning', 'Afternoon', 'Evening', 'Flexible'
      preferred_duration TEXT DEFAULT '1-2 hours',
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- NGOs Table
    CREATE TABLE IF NOT EXISTS ngos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      org_name TEXT NOT NULL,
      reg_number TEXT NOT NULL,
      mission TEXT,
      website TEXT,
      contact_person TEXT,
      verification_status TEXT DEFAULT 'pending' CHECK(verification_status IN ('pending', 'verified', 'rejected')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Help Requests (5 Sectors: Education, Personal, Community, NGO, Donation)
    CREATE TABLE IF NOT EXISTS help_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      sector TEXT NOT NULL CHECK(sector IN (
        'Education & Skill Development',
        'Personal & Daily-Life Assistance',
        'Community Assistance',
        'NGO & Volunteering',
        'Donation & Resource Assistance'
      )),
      required_skills TEXT, -- comma-separated or json string
      urgency TEXT DEFAULT 'Normal' CHECK(urgency IN ('Normal', 'Urgent', 'Critical')),
      date_time TEXT,
      duration TEXT,
      city TEXT NOT NULL,
      area TEXT NOT NULL,
      is_remote INTEGER DEFAULT 0,
      helpers_needed INTEGER DEFAULT 1,
      status TEXT DEFAULT 'Open' CHECK(status IN ('Draft', 'Open', 'Accepted', 'In Progress', 'Completed', 'Cancelled', 'Expired')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Help Offers / Applications
    CREATE TABLE IF NOT EXISTS help_offers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id INTEGER NOT NULL,
      helper_id INTEGER NOT NULL,
      message TEXT,
      match_score INTEGER DEFAULT 0,
      match_reasons TEXT,
      status TEXT DEFAULT 'Pending' CHECK(status IN ('Pending', 'Accepted', 'Declined', 'Completed')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(request_id) REFERENCES help_requests(id) ON DELETE CASCADE,
      FOREIGN KEY(helper_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Ratings and Feedback
    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id INTEGER NOT NULL,
      reviewer_id INTEGER NOT NULL,
      reviewee_id INTEGER NOT NULL,
      rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
      feedback TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(request_id) REFERENCES help_requests(id) ON DELETE CASCADE,
      FOREIGN KEY(reviewer_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(reviewee_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- In-App Messages
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id INTEGER,
      sender_id INTEGER NOT NULL,
      receiver_id INTEGER,
      message TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(request_id) REFERENCES help_requests(id) ON DELETE CASCADE,
      FOREIGN KEY(sender_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(receiver_id) REFERENCES users(id) ON DELETE SET NULL
    );

    -- Notifications
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      link TEXT,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Volunteer Opportunities (NGO created)
    CREATE TABLE IF NOT EXISTS volunteer_opportunities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ngo_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      skills_required TEXT,
      schedule TEXT,
      city TEXT NOT NULL,
      area TEXT NOT NULL,
      volunteers_needed INTEGER DEFAULT 5,
      volunteers_registered INTEGER DEFAULT 0,
      status TEXT DEFAULT 'Open' CHECK(status IN ('Open', 'In Progress', 'Completed', 'Closed')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(ngo_id) REFERENCES ngos(id) ON DELETE CASCADE
    );

    -- Volunteer Applications
    CREATE TABLE IF NOT EXISTS volunteer_applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      opportunity_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      note TEXT,
      status TEXT DEFAULT 'Applied' CHECK(status IN ('Applied', 'Approved', 'Rejected')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(opportunity_id) REFERENCES volunteer_opportunities(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Blood Donation Requests (Urgent Community Support)
    CREATE TABLE IF NOT EXISTS blood_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      requester_id INTEGER NOT NULL,
      patient_name TEXT NOT NULL,
      blood_group TEXT NOT NULL CHECK(blood_group IN ('A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-')),
      units_needed INTEGER DEFAULT 1,
      hospital_name TEXT NOT NULL,
      city TEXT NOT NULL,
      area TEXT NOT NULL,
      urgency TEXT DEFAULT 'Urgent' CHECK(urgency IN ('Immediate / Critical', 'Within 24 Hours', 'Scheduled')),
      contact_phone TEXT NOT NULL,
      status TEXT DEFAULT 'Open' CHECK(status IN ('Open', 'Fulfilled', 'Closed')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(requester_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Blood Pledges / Donors
    CREATE TABLE IF NOT EXISTS blood_pledges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      blood_request_id INTEGER NOT NULL,
      donor_id INTEGER NOT NULL,
      note TEXT,
      status TEXT DEFAULT 'Pledged' CHECK(status IN ('Pledged', 'Donated', 'Cancelled')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(blood_request_id) REFERENCES blood_requests(id) ON DELETE CASCADE,
      FOREIGN KEY(donor_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Resource & Goods Donation (Request or Offer)
    CREATE TABLE IF NOT EXISTS resource_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('Offer', 'Need')),
      category TEXT NOT NULL CHECK(category IN ('Study Materials & Books', 'Food & Meals', 'Clothing & Blankets', 'Medical & Mobility Aids', 'Electronics & Tools')),
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      item_condition TEXT DEFAULT 'Good' CHECK(item_condition IN ('New', 'Like New', 'Good', 'Fair')),
      quantity TEXT DEFAULT '1',
      city TEXT NOT NULL,
      area TEXT NOT NULL,
      status TEXT DEFAULT 'Available' CHECK(status IN ('Available', 'Claimed', 'Completed')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Reports & Disputes (Trust & Safety)
    CREATE TABLE IF NOT EXISTS disputes_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reporter_id INTEGER NOT NULL,
      reported_user_id INTEGER,
      request_id INTEGER,
      category TEXT NOT NULL CHECK(category IN ('No Show / Cancellation', 'Inappropriate Behavior', 'Misleading Information', 'Spam / Commercial Request', 'Safety Violation')),
      details TEXT NOT NULL,
      status TEXT DEFAULT 'Pending' CHECK(status IN ('Pending', 'Investigating', 'Resolved', 'Dismissed')),
      admin_resolution TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(reporter_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(reported_user_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY(request_id) REFERENCES help_requests(id) ON DELETE SET NULL
    );

    -- Help Circles (Collaborative community teams)
    CREATE TABLE IF NOT EXISTS help_circles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      request_id INTEGER,
      lead_user_id INTEGER NOT NULL,
      status TEXT DEFAULT 'Active' CHECK(status IN ('Active', 'Completed', 'Archived')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(request_id) REFERENCES help_requests(id) ON DELETE SET NULL,
      FOREIGN KEY(lead_user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS help_circle_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      circle_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      role TEXT DEFAULT 'Volunteer',
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(circle_id) REFERENCES help_circles(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  seedDefaultData();
}

function seedDefaultData() {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount > 0) {
    return; // Already seeded
  }

  console.log('Seeding initial HelpMate data...');

  const defaultPassword = hashPassword('password123');
  const adminPassword = hashPassword('admin123');

  // Insert Default Users
  // 1. Alex Johnson / Rahul Sharma (Active User / Seeker)
  insertUser.run(
    'Alex Johnson',
    'alex@example.com',
    defaultPassword,
    'user',
    'Curious learner and active community contributor passionate about tutoring and neighborhood assistance.',
    '+91 98765 43210',
    'AJ',
    'Bengaluru',
    'Koramangala',
    10,
    1,
    95.0,
    4.9,
    14
  );

  // 1b. Rahul Sharma alias
  insertUser.run(
    'Rahul Sharma',
    'rahul@example.com',
    defaultPassword,
    'user',
    'Computer Science 3rd year student seeking academic tutoring and community guidance.',
    '+91 98765 43210',
    'RS',
    'Bengaluru',
    'Koramangala',
    10,
    1,
    92.5,
    4.8,
    6
  );

  // 2. Priya Patel (Helper & Volunteer)
  insertUser.run(
    'Priya Patel',
    'priya@example.com',
    defaultPassword,
    'user',
    'Senior Software Developer & Passionate Community Volunteer. Offering tutoring in Python, Web Dev, and assisting senior citizens.',
    '+91 98111 22334',
    '👩‍💻',
    'New Delhi',
    'Sector 15, Rohini',
    15,
    1,
    98.5,
    4.95,
    28
  );

  // 3. Amit Verma (Daily Life & Community Helper)
  insertUser.run(
    'Amit Verma',
    'amit@example.com',
    defaultPassword,
    'user',
    'Social worker and physical fitness trainer. Helping with grocery delivery, elderly mobility, and park cleanup drives.',
    '+91 98222 33445',
    '🏃‍♂️',
    'New Delhi',
    'Pitampura',
    20,
    1,
    96.0,
    4.85,
    19
  );

  // 4. CareIndia Foundation (NGO Org)
  insertUser.run(
    'CareIndia Foundation',
    'careindia@ngo.org',
    defaultPassword,
    'ngo',
    'Dedicated NGO working for underprivileged children education, women empowerment, and emergency blood donation coordination.',
    '+91 11 2345 6789',
    '🏢',
    'New Delhi',
    'Connaught Place',
    35,
    1,
    99.0,
    5.0,
    54
  );

  // 5. Dr. Sameer Khan (Admin)
  insertUser.run(
    'Dr. Sameer Khan (Admin)',
    'admin@helpmate.org',
    adminPassword,
    'admin',
    'Platform Administrator & Community Trust & Safety Officer.',
    '+91 99999 00000',
    '🛡️',
    'New Delhi',
    'Central Secretariat',
    50,
    1,
    100.0,
    5.0,
    100
  );

  // Insert Skills for Priya
  const insertSkill = db.prepare(`
    INSERT INTO user_skills (user_id, skill_name, proficiency, experience_years)
    VALUES (?, ?, ?, ?)
  `);
  insertSkill.run(2, 'Python Programming', 'Expert', 5);
  insertSkill.run(2, 'Data Structures & Algorithms', 'Expert', 4);
  insertSkill.run(2, 'Mathematics & Calculus', 'Intermediate', 3);
  insertSkill.run(2, 'Elderly Care & Support', 'Intermediate', 2);

  // Skills for Amit
  insertSkill.run(3, 'Elderly Assistance', 'Expert', 4);
  insertSkill.run(3, 'Grocery & Daily Errands', 'Expert', 5);
  insertSkill.run(3, 'First Aid & CPR', 'Intermediate', 3);
  insertSkill.run(3, 'Community Organizing', 'Expert', 4);

  // Skills for Rahul
  insertSkill.run(1, 'Basic C++', 'Intermediate', 2);
  insertSkill.run(1, 'English Communication', 'Intermediate', 3);

  // Insert Availability for Priya
  const insertAvail = db.prepare(`
    INSERT INTO user_availability (user_id, day_of_week, time_slot, preferred_duration)
    VALUES (?, ?, ?, ?)
  `);
  insertAvail.run(2, 'Saturday', 'Afternoon', '2-3 hours');
  insertAvail.run(2, 'Sunday', 'Morning', '2-4 hours');
  insertAvail.run(2, 'Wednesday', 'Evening', '1-2 hours');

  // Insert Availability for Amit
  insertAvail.run(3, 'Monday', 'Morning', '2-3 hours');
  insertAvail.run(3, 'Thursday', 'Morning', '2-3 hours');
  insertAvail.run(3, 'Saturday', 'Flexible', '3-5 hours');

  // Insert NGO record for CareIndia
  const insertNgo = db.prepare(`
    INSERT INTO ngos (user_id, org_name, reg_number, mission, website, contact_person, verification_status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  insertNgo.run(
    4,
    'CareIndia Foundation',
    'REG-DEL-2018-98442',
    'Bridging educational divides and mobilizing youth volunteers for community relief.',
    'https://careindia-foundation.org',
    'Sunita Mehra (Director)',
    'verified'
  );

  // Insert Sample Help Requests across the 5 sectors
  const insertRequest = db.prepare(`
    INSERT INTO help_requests (user_id, title, description, sector, required_skills, urgency, date_time, duration, city, area, is_remote, helpers_needed, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Seeded Requests matching UI 03 & Sprints
  insertRequest.run(
    4,
    'Programming Mentor Needed',
    'Help a curious student take their first steps in Python and build something meaningful. Mentorship and foundational coding guidance.',
    'Education & Skill Development',
    'Python, Mentoring',
    'Normal',
    'Nov 21–22 • Flexible',
    '2 hrs',
    'Bengaluru',
    'Koramangala • 2.4 km away',
    1,
    1,
    'Open'
  );

  insertRequest.run(
    3,
    'Community Clean-up Drive',
    'Join your neighbours for a cleaner, greener weekend at the beautiful Lakeside Park. Tools and safety gloves provided.',
    'Community Assistance',
    'Teamwork, Community',
    'Normal',
    'Sun, Nov 22 • 7:00–10:00 AM',
    '3 hrs',
    'Bengaluru',
    'HSR Layout • 3.1 km away',
    0,
    10,
    'Open'
  );

  insertRequest.run(
    4,
    'Weekend Teaching Volunteer',
    'Make learning a little brighter. Teach basic English and maths to children aged 8–12.',
    'NGO & Volunteering',
    'Teaching, Communication',
    'Normal',
    'Sat, Nov 21 • 10:00 AM–1:00 PM',
    '3 hrs',
    'Bengaluru',
    'Indiranagar • 4.8 km away',
    0,
    5,
    'Open'
  );

  // Sector 1: Education & Skill Development
  insertRequest.run(
    1,
    'Need guidance with Python Binary Trees & Recursion assignment',
    'I am preparing for upcoming end-term university exams and getting stuck with Binary Search Trees and recursive algorithms. Need a patient mentor for a 2-hour session.',
    'Education & Skill Development',
    'Python Programming, Data Structures & Algorithms',
    'Urgent',
    'Tomorrow at 4:00 PM',
    '2 hours',
    'Bengaluru',
    'Koramangala',
    1,
    1,
    'Open'
  );

  // Sector 2: Personal & Daily-Life Assistance
  insertRequest.run(
    1,
    'Assistance for 76-year-old grandfather visiting eye hospital',
    'Grandfather has a cataract checkup at AIIMS Extension. Need a trustworthy companion to help him navigate the hospital desk and wheelchair assistance for 2 hours.',
    'Personal & Daily-Life Assistance',
    'Elderly Care & Support, First Aid',
    'Normal',
    'This Friday 10:00 AM',
    '3 hours',
    'New Delhi',
    'Rohini to AIIMS',
    0,
    1,
    'Open'
  );

  // Sector 3: Community Assistance
  insertRequest.run(
    3,
    'Neighborhood Park Cleanup & Tree Sapling Planting',
    'Community drive to clean the Sector 14 central park and plant 40 indigenous herbal and flowering saplings. Tools and saplings will be provided.',
    'Community Assistance',
    'Community Organizing, Physical Assistance',
    'Normal',
    'Sunday 7:30 AM',
    '3 hours',
    'New Delhi',
    'Sector 14 Central Park, Rohini',
    0,
    5,
    'Open'
  );

  // Sector 4: NGO & Volunteering
  insertRequest.run(
    4,
    'Weekend Slum Remedial Teaching Camp for Underprivileged Kids',
    'Teaching basic mathematics, English reading, and foundational computer concepts to 35 primary school children in slum clusters.',
    'NGO & Volunteering',
    'Mathematics, English Communication, Teaching',
    'Normal',
    'Every Saturday 10:00 AM - 1:00 PM',
    '3 hours',
    'New Delhi',
    'Mangolpuri Community Hall',
    0,
    4,
    'Open'
  );

  // Sector 5: Donation & Resource Assistance
  insertRequest.run(
    1,
    'Requesting 2nd Year Computer Science Reference Textbooks',
    'Looking for second-hand textbooks for Operating Systems (Silberschatz) and Computer Architecture (Tanenbaum) for exam preparation.',
    'Donation & Resource Assistance',
    'Study Materials, Books',
    'Normal',
    'Anytime this week',
    'Flexible',
    'New Delhi',
    'Rohini',
    0,
    1,
    'Open'
  );

  // Insert a completed request with review to demonstrate trust & reputation
  insertRequest.run(
    1,
    'High School Calculus Derivative Problem Solving Help',
    'Needed help with chain rule and integration by parts before midterms.',
    'Education & Skill Development',
    'Mathematics & Calculus',
    'Normal',
    'Last Week',
    '2 hours',
    'New Delhi',
    'Rohini',
    1,
    1,
    'Completed'
  );

  // Offer on the completed request
  db.prepare(`
    INSERT INTO help_offers (request_id, helper_id, message, match_score, match_reasons, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    6,
    2,
    'Happy to assist! I love mathematics and have helped many students with calculus.',
    96,
    JSON.stringify([
      'Exact Skill Match: Mathematics & Calculus',
      'Availability Matched: Weekend slots',
      'Close Proximity: Same Rohini Sector',
      'Top Reliability: 98.5% helper score'
    ]),
    'Completed'
  );

  // Review for Priya from Rahul
  db.prepare(`
    INSERT INTO reviews (request_id, reviewer_id, reviewee_id, rating, feedback)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    6,
    1,
    2,
    5,
    'Priya was incredible! Explained difficult integration concepts with simple step-by-step examples. Highly recommended mentor!'
  );

  // Insert Volunteer Opportunity for CareIndia
  db.prepare(`
    INSERT INTO volunteer_opportunities (ngo_id, title, description, skills_required, schedule, city, area, volunteers_needed, volunteers_registered, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    1,
    'Digital Literacy Drive for Senior Citizens',
    'Volunteers needed to help seniors learn smartphone safety, UPI digital payments, and video calling family.',
    'Basic Tech, Patience, Communication',
    'Saturday 3 PM - 6 PM',
    'New Delhi',
    'Connaught Place & Karol Bagh',
    8,
    3,
    'Open'
  );

  // Insert Urgent Blood Donation Requests
  const insertBlood = db.prepare(`
    INSERT INTO blood_requests (requester_id, patient_name, blood_group, units_needed, hospital_name, city, area, urgency, contact_phone, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertBlood.run(
    1,
    'Kavita Verma (Emergency Surgery)',
    'B+',
    2,
    'Max Super Speciality Hospital, Shalimar Bagh',
    'New Delhi',
    'Shalimar Bagh',
    'Immediate / Critical',
    '+91 98765 43210',
    'Open'
  );

  insertBlood.run(
    3,
    'Ramesh Chawla (Platelet Requirement)',
    'O-',
    1,
    'Sir Ganga Ram Hospital',
    'New Delhi',
    'Rajendra Nagar',
    'Within 24 Hours',
    '+91 98222 33445',
    'Open'
  );

  // Insert Resource Items (Donations & Needs)
  const insertResource = db.prepare(`
    INSERT INTO resource_items (user_id, type, category, title, description, item_condition, quantity, city, area, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertResource.run(
    2,
    'Offer',
    'Study Materials & Books',
    'Complete Set of B.Tech CSE Semester 1-4 Textbooks & Gate Guides',
    'Offering well-maintained books for Algorithms, Database Systems, Computer Networks, and Discrete Mathematics for anyone in need.',
    'Like New',
    '8 books',
    'New Delhi',
    'Sector 15, Rohini',
    'Available'
  );

  insertResource.run(
    3,
    'Offer',
    'Medical & Mobility Aids',
    'Lightweight Folding Wheelchair and Walker',
    'Gently used wheelchair in perfect condition. Donating to any patient or family needing mobility support.',
    'Good',
    '1 wheelchair, 1 walker',
    'New Delhi',
    'Pitampura',
    'Available'
  );

  insertResource.run(
    1,
    'Need',
    'Clothing & Blankets',
    'Warm blankets and sweaters for night shelter distribution',
    'Collecting clean winter clothes and warm blankets for 20 homeless individuals near Rohini railway underpass.',
    'Good',
    '20 blankets',
    'New Delhi',
    'Rohini',
    'Available'
  );

  // Insert Notifications
  const insertNotif = db.prepare(`
    INSERT INTO notifications (user_id, title, message, link, is_read)
    VALUES (?, ?, ?, ?, ?)
  `);

  insertNotif.run(
    1,
    'Welcome to HelpMate!',
    'Your profile is active. You can create help requests or discover skilled helpers nearby.',
    '#requests',
    0
  );

  insertNotif.run(
    2,
    'New Matching Help Request!',
    'Rahul Sharma posted a request for Python & Data Structures in Rohini (96% Match with your skills).',
    '#matching',
    0
  );

  insertNotif.run(
    1,
    'Emergency Blood Alert in your city',
    'Urgent B+ blood required at Max Hospital Shalimar Bagh.',
    '#blood',
    0
  );

  // Insert Sample Messages
  db.prepare(`
    INSERT INTO messages (request_id, sender_id, receiver_id, message)
    VALUES (?, ?, ?, ?)
  `).run(
    1,
    2,
    1,
    'Hi Rahul! I saw your request for Python Binary Trees. I would love to mentor you tomorrow afternoon over Google Meet or in person at the community library!'
  );

  console.log('Seed data successfully loaded.');
}

// Multi-Factor Matching Algorithm
function calculateMatchScore(request, helper) {
  let score = 0;
  const reasons = [];

  // 1. Skill Match (Weight: 35 points)
  const reqSkills = (request.required_skills || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
  const helperSkills = (helper.skills || []).map(s => (typeof s === 'string' ? s : s.skill_name || '').toLowerCase());

  let matchedSkillsCount = 0;
  reqSkills.forEach(req => {
    if (helperSkills.some(hs => hs.includes(req) || req.includes(hs))) {
      matchedSkillsCount++;
    }
  });

  if (reqSkills.length > 0) {
    const skillRatio = matchedSkillsCount / reqSkills.length;
    const skillPoints = Math.round(skillRatio * 35);
    score += skillPoints;
    if (skillPoints > 0) {
      reasons.push(`Skills match (+${skillPoints}%): Matched ${matchedSkillsCount} of ${reqSkills.length} required skill(s)`);
    } else {
      reasons.push(`Skills: No direct match found (0/35%)`);
    }
  } else {
    score += 25; // Default for general requests with no hard skill requirements
    reasons.push(`General assistance: Open to broad volunteer profiles (+25%)`);
  }

  // 2. Availability Match (Weight: 25 points)
  // Check day of week and slot overlap
  const reqTiming = (request.date_time || '').toLowerCase();
  const helperAvail = helper.availability || [];

  let availPoints = 15; // default moderate score
  const matchedSlot = helperAvail.find(a => {
    const day = (a.day_of_week || '').toLowerCase();
    const slot = (a.time_slot || '').toLowerCase();
    return reqTiming.includes(day) || reqTiming.includes(slot) || day === 'weekends' || day === 'flexible';
  });

  if (matchedSlot) {
    availPoints = 25;
    reasons.push(`Availability (+25%): Matched ${matchedSlot.day_of_week} (${matchedSlot.time_slot})`);
  } else if (helperAvail.length > 0) {
    availPoints = 18;
    reasons.push(`Availability (+18%): Helper has active recurring slots`);
  } else {
    availPoints = 10;
    reasons.push(`Availability (+10%): Flexible schedule indicated`);
  }
  score += availPoints;

  // 3. Location & Radius Match (Weight: 20 points)
  if (request.is_remote) {
    score += 20;
    reasons.push(`Location (+20%): Remote / Online assistance compatible`);
  } else {
    const reqCity = (request.city || '').toLowerCase();
    const helperCity = (helper.city || '').toLowerCase();
    const reqArea = (request.area || '').toLowerCase();
    const helperArea = (helper.area || '').toLowerCase();

    if (reqCity === helperCity && reqArea === helperArea) {
      score += 20;
      reasons.push(`Location (+20%): Located in the exact same neighborhood (${request.area})`);
    } else if (reqCity === helperCity) {
      score += 15;
      reasons.push(`Location (+15%): Located within same city (${request.city}) and within helper radius`);
    } else {
      score += 5;
      reasons.push(`Location (+5%): Different locality (${helper.city || 'Other'})`);
    }
  }

  // 4. Reliability & Experience Match (Weight: 20 points)
  const relScore = Number(helper.reliability_score || 90);
  const rating = Number(helper.rating_avg || 4.5);
  const relPoints = Math.round((relScore / 100) * 12 + (rating / 5) * 8);
  score += relPoints;
  reasons.push(`Trust & Reliability (+${relPoints}%): ${rating}★ rating, ${relScore}% reliability score`);

  return {
    score: Math.min(100, Math.max(10, score)),
    reasons
  };
}

module.exports = {
  db,
  initDatabase,
  hashPassword,
  verifyPassword,
  calculateMatchScore
};
