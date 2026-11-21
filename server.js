/**
 * HelpMate - Community Assistance Platform
 * Backend Server (Node.js & Express)
 * Provides comprehensive APIs for all 6 SE Lab Modules
 */

const express = require('express');
const cors = require('cors');
const path = require('node:path');
const {
  db,
  initDatabase,
  hashPassword,
  verifyPassword,
  calculateMatchScore
} = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Database schema and seed default records
initDatabase();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Simple Token / Session Middleware for Demo Simulation
// Can pass `x-user-id` in header or fall back to default demo user (Rahul Sharma: id 1)
function getAuthUser(req) {
  const userId = req.headers['x-user-id'] || req.query.current_user_id || 1;
  const user = db.prepare('SELECT id, name, email, role, city, area, radius_km, is_verified, reliability_score, rating_avg, rating_count FROM users WHERE id = ?').get(userId);
  return user || db.prepare('SELECT * FROM users WHERE id = 1').get();
}

// ====================================================================
// MODULE 1: AUTHENTICATION & USER PROFILE MANAGEMENT
// ====================================================================

// 1.1 Register
app.post('/api/auth/register', (req, res) => {
  try {
    const { name, email, password, role = 'user', bio, phone, city, area, orgName, regNumber } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    const password_hash = hashPassword(password);
    const avatar = role === 'ngo' ? '🏢' : '👤';

    const insertResult = db.prepare(`
      INSERT INTO users (name, email, password_hash, role, bio, phone, avatar, city, area)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(name, email, password_hash, role, bio || '', phone || '', avatar, city || 'New Delhi', area || 'Connaught Place');

    const newUserId = insertResult.lastInsertRowid;

    if (role === 'ngo') {
      db.prepare(`
        INSERT INTO ngos (user_id, org_name, reg_number, mission, contact_person, verification_status)
        VALUES (?, ?, ?, ?, ?, 'pending')
      `).run(newUserId, orgName || name, regNumber || 'PENDING-REG', bio || 'Community Support NGO', name);
    }

    // Add welcome notification
    db.prepare(`
      INSERT INTO notifications (user_id, title, message, link)
      VALUES (?, 'Welcome to HelpMate!', 'Your account has been registered successfully. Explore help requests or update your profile skills.', '#profile')
    `).run(newUserId);

    const user = db.prepare('SELECT id, name, email, role, city, area, avatar, reliability_score, rating_avg FROM users WHERE id = ?').get(newUserId);
    res.status(201).json({ success: true, user });
  } catch (err) {
    console.error('Registration Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 1.2 Login
app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const { password_hash, ...safeUser } = user;
    res.json({ success: true, user: safeUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 1.3 Fast Demo Role Switcher
app.post('/api/auth/switch-demo', (req, res) => {
  const { demoKey } = req.body;
  let targetEmail = 'rahul@example.com';
  if (demoKey === 'priya') targetEmail = 'priya@example.com';
  if (demoKey === 'careindia') targetEmail = 'careindia@ngo.org';
  if (demoKey === 'admin') targetEmail = 'admin@helpmate.org';
  if (demoKey === 'amit') targetEmail = 'amit@example.com';

  const user = db.prepare('SELECT id, name, email, role, bio, phone, avatar, city, area, radius_km, is_verified, reliability_score, rating_avg, rating_count FROM users WHERE email = ?').get(targetEmail);
  if (!user) return res.status(404).json({ error: 'Demo user not found' });
  res.json({ success: true, user });
});

// 1.4 Get Profile Details (with skills, availability, reviews)
app.get('/api/users/profile/:id', (req, res) => {
  try {
    const userId = req.params.id;
    const user = db.prepare('SELECT id, name, email, role, bio, phone, avatar, city, area, radius_km, share_approx_location, is_verified, reliability_score, rating_avg, rating_count, created_at FROM users WHERE id = ?').get(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const skills = db.prepare('SELECT * FROM user_skills WHERE user_id = ?').all(userId);
    const availability = db.prepare('SELECT * FROM user_availability WHERE user_id = ?').all(userId);
    const reviews = db.prepare(`
      SELECT r.*, u.name as reviewer_name, u.avatar as reviewer_avatar
      FROM reviews r
      JOIN users u ON r.reviewer_id = u.id
      WHERE r.reviewee_id = ?
      ORDER BY r.created_at DESC
    `).all(userId);

    const ngoDetails = user.role === 'ngo' ? db.prepare('SELECT * FROM ngos WHERE user_id = ?').get(userId) : null;

    res.json({
      user,
      skills,
      availability,
      reviews,
      ngoDetails
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 1.5 Update Profile
app.put('/api/users/profile', (req, res) => {
  try {
    const authUser = getAuthUser(req);
    const { name, bio, phone, city, area, radius_km, share_approx_location } = req.body;

    db.prepare(`
      UPDATE users
      SET name = COALESCE(?, name),
          bio = COALESCE(?, bio),
          phone = COALESCE(?, phone),
          city = COALESCE(?, city),
          area = COALESCE(?, area),
          radius_km = COALESCE(?, radius_km),
          share_approx_location = COALESCE(?, share_approx_location)
      WHERE id = ?
    `).run(name, bio, phone, city, area, radius_km, share_approx_location, authUser.id);

    const updated = db.prepare('SELECT id, name, email, role, bio, phone, avatar, city, area, radius_km, share_approx_location, is_verified, reliability_score, rating_avg, rating_count FROM users WHERE id = ?').get(authUser.id);
    res.json({ success: true, user: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 1.6 Manage Skills
app.post('/api/users/skills', (req, res) => {
  try {
    const authUser = getAuthUser(req);
    const { skill_name, proficiency = 'Intermediate', experience_years = 1 } = req.body;
    if (!skill_name) return res.status(400).json({ error: 'Skill name is required' });

    const result = db.prepare(`
      INSERT INTO user_skills (user_id, skill_name, proficiency, experience_years)
      VALUES (?, ?, ?, ?)
    `).run(authUser.id, skill_name, proficiency, experience_years);

    res.status(201).json({ success: true, id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/users/skills/:id', (req, res) => {
  try {
    const authUser = getAuthUser(req);
    db.prepare('DELETE FROM user_skills WHERE id = ? AND user_id = ?').run(req.params.id, authUser.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 1.7 Manage Availability
app.post('/api/users/availability', (req, res) => {
  try {
    const authUser = getAuthUser(req);
    const { day_of_week, time_slot, preferred_duration } = req.body;
    if (!day_of_week || !time_slot) return res.status(400).json({ error: 'Day and time slot required' });

    const result = db.prepare(`
      INSERT INTO user_availability (user_id, day_of_week, time_slot, preferred_duration)
      VALUES (?, ?, ?, ?)
    `).run(authUser.id, day_of_week, time_slot, preferred_duration || '1-2 hours');

    res.status(201).json({ success: true, id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/users/availability/:id', (req, res) => {
  try {
    const authUser = getAuthUser(req);
    db.prepare('DELETE FROM user_availability WHERE id = ? AND user_id = ?').run(req.params.id, authUser.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 1.8 Helper Discovery (Browse Helpers)
app.get('/api/users/helpers', (req, res) => {
  try {
    const { skill, city } = req.query;
    let query = `
      SELECT DISTINCT u.id, u.name, u.role, u.bio, u.avatar, u.city, u.area, u.radius_km, u.is_verified, u.reliability_score, u.rating_avg, u.rating_count
      FROM users u
      LEFT JOIN user_skills us ON u.id = us.user_id
      WHERE u.role != 'admin'
    `;
    const params = [];

    if (city) {
      query += ` AND LOWER(u.city) LIKE LOWER(?)`;
      params.push(`%${city}%`);
    }
    if (skill) {
      query += ` AND LOWER(us.skill_name) LIKE LOWER(?)`;
      params.push(`%${skill}%`);
    }

    query += ` ORDER BY u.reliability_score DESC, u.rating_avg DESC LIMIT 20`;
    const helpers = db.prepare(query).all(...params);

    // Attach skills to each helper
    const enriched = helpers.map(h => {
      const skills = db.prepare('SELECT skill_name, proficiency FROM user_skills WHERE user_id = ?').all(h.id);
      return { ...h, skills };
    });

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ====================================================================
// MODULE 2 & 3: HELP REQUESTS, 5 SECTORS & MULTI-FACTOR MATCHING
// ====================================================================

// 2.1 Get Help Requests (with filters: sector, search, urgency, status, city)
app.get('/api/requests', (req, res) => {
  try {
    const { sector, search, urgency, status, city, my_requests } = req.query;
    const authUser = getAuthUser(req);

    let query = `
      SELECT hr.*, u.name as requester_name, u.avatar as requester_avatar, u.rating_avg as requester_rating, u.reliability_score as requester_reliability,
             (SELECT COUNT(*) FROM help_offers WHERE request_id = hr.id) as offers_count
      FROM help_requests hr
      JOIN users u ON hr.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (my_requests === 'true') {
      query += ` AND hr.user_id = ?`;
      params.push(authUser.id);
    }
    if (sector && sector !== 'All') {
      query += ` AND hr.sector = ?`;
      params.push(sector);
    }
    if (urgency && urgency !== 'All') {
      query += ` AND hr.urgency = ?`;
      params.push(urgency);
    }
    if (status && status !== 'All') {
      query += ` AND hr.status = ?`;
      params.push(status);
    }
    if (city) {
      query += ` AND LOWER(hr.city) LIKE LOWER(?)`;
      params.push(`%${city}%`);
    }
    if (search) {
      query += ` AND (LOWER(hr.title) LIKE LOWER(?) OR LOWER(hr.description) LIKE LOWER(?) OR LOWER(hr.required_skills) LIKE LOWER(?))`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY CASE hr.urgency WHEN 'Critical' THEN 1 WHEN 'Urgent' THEN 2 ELSE 3 END, hr.created_at DESC`;

    const requests = db.prepare(query).all(...params);
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2.2 Get Request by ID (including offers and applicant details with calculated match scores)
app.get('/api/requests/:id', (req, res) => {
  try {
    const requestId = req.params.id;
    const request = db.prepare(`
      SELECT hr.*, u.name as requester_name, u.avatar as requester_avatar, u.phone as requester_phone, u.rating_avg as requester_rating, u.reliability_score as requester_reliability
      FROM help_requests hr
      JOIN users u ON hr.user_id = u.id
      WHERE hr.id = ?
    `).get(requestId);

    if (!request) return res.status(404).json({ error: 'Help request not found' });

    // Fetch offers with helper details
    const offers = db.prepare(`
      SELECT ho.*, u.name as helper_name, u.avatar as helper_avatar, u.city as helper_city, u.area as helper_area,
             u.rating_avg as helper_rating, u.reliability_score as helper_reliability, u.phone as helper_phone
      FROM help_offers ho
      JOIN users u ON ho.helper_id = u.id
      WHERE ho.request_id = ?
      ORDER BY ho.match_score DESC, ho.created_at DESC
    `).all(requestId);

    // Parse reasons if stored as JSON
    const enrichedOffers = offers.map(o => ({
      ...o,
      match_reasons: o.match_reasons ? JSON.parse(o.match_reasons) : []
    }));

    res.json({ request, offers: enrichedOffers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2.3 Create Help Request
app.post('/api/requests', (req, res) => {
  try {
    const authUser = getAuthUser(req);
    const {
      title,
      description,
      sector,
      required_skills,
      urgency = 'Normal',
      date_time,
      duration,
      city,
      area,
      is_remote = 0,
      helpers_needed = 1
    } = req.body;

    if (!title || !description || !sector) {
      return res.status(400).json({ error: 'Title, description, and sector are required' });
    }

    const insertResult = db.prepare(`
      INSERT INTO help_requests (
        user_id, title, description, sector, required_skills, urgency, date_time, duration, city, area, is_remote, helpers_needed, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Open')
    `).run(
      authUser.id,
      title,
      description,
      sector,
      required_skills || '',
      urgency,
      date_time || 'Flexible',
      duration || '1-2 hours',
      city || authUser.city || 'New Delhi',
      area || authUser.area || 'Connaught Place',
      is_remote ? 1 : 0,
      helpers_needed || 1
    );

    // Notify matching helpers in the same sector/city
    const helpers = db.prepare(`
      SELECT id FROM users
      WHERE id != ? AND role = 'user'
      LIMIT 3
    `).all(authUser.id);

    helpers.forEach(h => {
      db.prepare(`
        INSERT INTO notifications (user_id, title, message, link)
        VALUES (?, 'New Help Request Nearby!', ?, '#requests')
      `).run(h.id, `"${title}" has been posted in ${sector}. Check if you can assist!`);
    });

    res.status(201).json({ success: true, requestId: insertResult.lastInsertRowid });
  } catch (err) {
    console.error('Create Request Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 2.4 Update / Cancel Request
app.put('/api/requests/:id', (req, res) => {
  try {
    const authUser = getAuthUser(req);
    const { title, description, status, urgency, duration } = req.body;
    const reqItem = db.prepare('SELECT * FROM help_requests WHERE id = ?').get(req.params.id);

    if (!reqItem) return res.status(404).json({ error: 'Request not found' });
    if (reqItem.user_id !== authUser.id && authUser.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to modify this request' });
    }

    db.prepare(`
      UPDATE help_requests
      SET title = COALESCE(?, title),
          description = COALESCE(?, description),
          status = COALESCE(?, status),
          urgency = COALESCE(?, urgency),
          duration = COALESCE(?, duration)
      WHERE id = ?
    `).run(title, description, status, urgency, duration, req.params.id);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2.5 Offer Help on Request (with Multi-Factor Matching calculation)
app.post('/api/requests/:id/offers', (req, res) => {
  try {
    const authUser = getAuthUser(req);
    const requestId = req.params.id;
    const { message } = req.body;

    const reqItem = db.prepare('SELECT * FROM help_requests WHERE id = ?').get(requestId);
    if (!reqItem) return res.status(404).json({ error: 'Request not found' });
    if (reqItem.user_id === authUser.id) {
      return res.status(400).json({ error: 'Cannot offer help on your own request' });
    }

    // Check if already offered
    const existing = db.prepare('SELECT id FROM help_offers WHERE request_id = ? AND helper_id = ?').get(requestId, authUser.id);
    if (existing) {
      return res.status(400).json({ error: 'You have already offered help for this request' });
    }

    // Retrieve helper profile with skills & availability for matching
    const helperSkills = db.prepare('SELECT skill_name, proficiency FROM user_skills WHERE user_id = ?').all(authUser.id);
    const helperAvail = db.prepare('SELECT day_of_week, time_slot FROM user_availability WHERE user_id = ?').all(authUser.id);
    const helperProfile = {
      ...authUser,
      skills: helperSkills,
      availability: helperAvail
    };

    // Run Explainable Multi-Factor Matching Algorithm
    const match = calculateMatchScore(reqItem, helperProfile);

    const insertResult = db.prepare(`
      INSERT INTO help_offers (request_id, helper_id, message, match_score, match_reasons, status)
      VALUES (?, ?, ?, ?, ?, 'Pending')
    `).run(
      requestId,
      authUser.id,
      message || 'I would be glad to help you with this request!',
      match.score,
      JSON.stringify(match.reasons)
    );

    // Notify requester
    db.prepare(`
      INSERT INTO notifications (user_id, title, message, link)
      VALUES (?, 'New Help Offer Received!', ?, ?)
    `).run(
      reqItem.user_id,
      `${authUser.name} offered assistance for "${reqItem.title}" (${match.score}% match score).`,
      `#request-details-${requestId}`
    );

    res.status(201).json({
      success: true,
      offerId: insertResult.lastInsertRowid,
      matchScore: match.score,
      matchReasons: match.reasons
    });
  } catch (err) {
    console.error('Offer Help Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 2.6 Accept Helper Offer (Workflow transition: Open -> Accepted)
app.post('/api/offers/:id/accept', (req, res) => {
  try {
    const authUser = getAuthUser(req);
    const offerId = req.params.id;

    const offer = db.prepare(`
      SELECT ho.*, hr.user_id as requester_id, hr.title as request_title
      FROM help_offers ho
      JOIN help_requests hr ON ho.request_id = hr.id
      WHERE ho.id = ?
    `).get(offerId);

    if (!offer) return res.status(404).json({ error: 'Offer not found' });
    if (offer.requester_id !== authUser.id && authUser.role !== 'admin') {
      return res.status(403).json({ error: 'Only request owner can accept an offer' });
    }

    // Accept this offer
    db.prepare("UPDATE help_offers SET status = 'Accepted' WHERE id = ?").run(offerId);
    // Move request status to Accepted
    db.prepare("UPDATE help_requests SET status = 'Accepted' WHERE id = ?").run(offer.request_id);

    // Notify helper
    db.prepare(`
      INSERT INTO notifications (user_id, title, message, link)
      VALUES (?, 'Help Offer Accepted! 🎉', ?, ?)
    `).run(
      offer.helper_id,
      `Your offer for "${offer.request_title}" has been accepted! You can now chat and coordinate details.`,
      `#request-details-${offer.request_id}`
    );

    // Automatically seed an introductory chat channel message
    db.prepare(`
      INSERT INTO messages (request_id, sender_id, receiver_id, message)
      VALUES (?, ?, ?, ?)
    `).run(
      offer.request_id,
      authUser.id,
      offer.helper_id,
      `Hello! I have accepted your offer to help with "${offer.request_title}". Thank you so much!`
    );

    res.json({ success: true, message: 'Helper offer accepted successfully!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2.7 Complete Request (Workflow transition: In Progress / Accepted -> Completed)
app.post('/api/requests/:id/complete', (req, res) => {
  try {
    const authUser = getAuthUser(req);
    const requestId = req.params.id;
    const reqItem = db.prepare('SELECT * FROM help_requests WHERE id = ?').get(requestId);

    if (!reqItem) return res.status(404).json({ error: 'Request not found' });
    if (reqItem.user_id !== authUser.id && authUser.role !== 'admin') {
      return res.status(403).json({ error: 'Only request owner can mark as complete' });
    }

    db.prepare("UPDATE help_requests SET status = 'Completed' WHERE id = ?").run(requestId);
    db.prepare("UPDATE help_offers SET status = 'Completed' WHERE request_id = ? AND status = 'Accepted'").run(requestId);

    // Find accepted helper to notify
    const acceptedOffer = db.prepare("SELECT helper_id FROM help_offers WHERE request_id = ? AND status = 'Completed'").get(requestId);
    if (acceptedOffer) {
      db.prepare(`
        INSERT INTO notifications (user_id, title, message, link)
        VALUES (?, 'Assistance Completed! ⭐', ?, ?)
      `).run(
        acceptedOffer.helper_id,
        `"${reqItem.title}" has been marked completed. Thank you for your contribution to the community!`,
        `#requests`
      );
    }

    res.json({ success: true, message: 'Request marked as completed!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3.5 Personalized Recommendations Feed (Explainable Matching for current user)
app.get('/api/matching/recommendations', (req, res) => {
  try {
    const authUser = getAuthUser(req);
    const userSkills = db.prepare('SELECT skill_name, proficiency FROM user_skills WHERE user_id = ?').all(authUser.id);
    const userAvail = db.prepare('SELECT day_of_week, time_slot FROM user_availability WHERE user_id = ?').all(authUser.id);

    const helperProfile = {
      ...authUser,
      skills: userSkills,
      availability: userAvail
    };

    const openRequests = db.prepare(`
      SELECT hr.*, u.name as requester_name, u.avatar as requester_avatar, u.rating_avg as requester_rating
      FROM help_requests hr
      JOIN users u ON hr.user_id = u.id
      WHERE hr.status = 'Open' AND hr.user_id != ?
      ORDER BY hr.created_at DESC
      LIMIT 25
    `).all(authUser.id);

    const scoredRequests = openRequests.map(reqItem => {
      const match = calculateMatchScore(reqItem, helperProfile);
      return {
        ...reqItem,
        matchScore: match.score,
        matchReasons: match.reasons
      };
    });

    // Sort by match score descending
    scoredRequests.sort((a, b) => b.matchScore - a.matchScore);

    res.json(scoredRequests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ====================================================================
// MODULE 4: NGO, VOLUNTEERING, BLOOD & RESOURCE DONATION
// ====================================================================

// 4.1 NGO Volunteer Opportunities
app.get('/api/ngo/opportunities', (req, res) => {
  try {
    const opportunities = db.prepare(`
      SELECT vo.*, n.org_name, n.reg_number, n.mission, n.verification_status, u.avatar as org_avatar
      FROM volunteer_opportunities vo
      JOIN ngos n ON vo.ngo_id = n.id
      JOIN users u ON n.user_id = u.id
      ORDER BY vo.created_at DESC
    `).all();
    res.json(opportunities);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ngo/opportunities', (req, res) => {
  try {
    const authUser = getAuthUser(req);
    const ngo = db.prepare('SELECT * FROM ngos WHERE user_id = ?').get(authUser.id);
    if (!ngo && authUser.role !== 'admin') {
      return res.status(403).json({ error: 'Only registered NGOs can post volunteer opportunities' });
    }

    const { title, description, skills_required, schedule, city, area, volunteers_needed = 5 } = req.body;
    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required' });
    }

    const ngoId = ngo ? ngo.id : 1;
    const result = db.prepare(`
      INSERT INTO volunteer_opportunities (ngo_id, title, description, skills_required, schedule, city, area, volunteers_needed)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(ngoId, title, description, skills_required || '', schedule || 'Weekends', city || authUser.city, area || authUser.area, volunteers_needed);

    res.status(201).json({ success: true, opportunityId: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ngo/opportunities/:id/apply', (req, res) => {
  try {
    const authUser = getAuthUser(req);
    const oppId = req.params.id;
    const { note } = req.body;

    const opp = db.prepare('SELECT * FROM volunteer_opportunities WHERE id = ?').get(oppId);
    if (!opp) return res.status(404).json({ error: 'Opportunity not found' });

    const existing = db.prepare('SELECT id FROM volunteer_applications WHERE opportunity_id = ? AND user_id = ?').get(oppId, authUser.id);
    if (existing) return res.status(400).json({ error: 'You have already applied for this opportunity' });

    db.prepare(`
      INSERT INTO volunteer_applications (opportunity_id, user_id, note)
      VALUES (?, ?, ?)
    `).run(oppId, authUser.id, note || 'Excited to contribute as a volunteer!');

    db.prepare(`
      UPDATE volunteer_opportunities
      SET volunteers_registered = volunteers_registered + 1
      WHERE id = ?
    `).run(oppId);

    res.status(201).json({ success: true, message: 'Application submitted successfully!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4.2 Blood Donation Emergency Requests
app.get('/api/blood/requests', (req, res) => {
  try {
    const { blood_group, urgency } = req.query;
    let query = `
      SELECT br.*, u.name as requester_name,
             (SELECT COUNT(*) FROM blood_pledges WHERE blood_request_id = br.id) as pledges_count
      FROM blood_requests br
      JOIN users u ON br.requester_id = u.id
      WHERE 1=1
    `;
    const params = [];
    if (blood_group && blood_group !== 'All') {
      query += ` AND br.blood_group = ?`;
      params.push(blood_group);
    }
    if (urgency && urgency !== 'All') {
      query += ` AND br.urgency = ?`;
      params.push(urgency);
    }

    query += ` ORDER BY CASE br.urgency WHEN 'Immediate / Critical' THEN 1 WHEN 'Within 24 Hours' THEN 2 ELSE 3 END, br.created_at DESC`;
    const list = db.prepare(query).all(...params);
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/blood/requests', (req, res) => {
  try {
    const authUser = getAuthUser(req);
    const { patient_name, blood_group, units_needed = 1, hospital_name, city, area, urgency = 'Urgent', contact_phone } = req.body;

    if (!patient_name || !blood_group || !hospital_name || !contact_phone) {
      return res.status(400).json({ error: 'Patient name, blood group, hospital name, and contact phone are required' });
    }

    const result = db.prepare(`
      INSERT INTO blood_requests (requester_id, patient_name, blood_group, units_needed, hospital_name, city, area, urgency, contact_phone)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(authUser.id, patient_name, blood_group, units_needed, hospital_name, city || authUser.city, area || authUser.area, urgency, contact_phone);

    // Notify users
    const sampleDonors = db.prepare("SELECT id FROM users WHERE role = 'user' LIMIT 5").all();
    sampleDonors.forEach(d => {
      db.prepare(`
        INSERT INTO notifications (user_id, title, message, link)
        VALUES (?, 'Urgent Blood Requirement Alert! 🩸', ?, '#blood')
      `).run(d.id, `Patient ${patient_name} urgently requires ${units_needed} unit(s) of ${blood_group} blood at ${hospital_name}.`);
    });

    res.status(201).json({ success: true, bloodRequestId: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/blood/requests/:id/pledge', (req, res) => {
  try {
    const authUser = getAuthUser(req);
    const requestId = req.params.id;
    const { note } = req.body;

    const bloodReq = db.prepare('SELECT * FROM blood_requests WHERE id = ?').get(requestId);
    if (!bloodReq) return res.status(404).json({ error: 'Blood request not found' });

    db.prepare(`
      INSERT INTO blood_pledges (blood_request_id, donor_id, note)
      VALUES (?, ?, ?)
    `).run(requestId, authUser.id, note || 'I am ready to donate blood and will reach the hospital.');

    // Notify requester
    db.prepare(`
      INSERT INTO notifications (user_id, title, message, link)
      VALUES (?, 'A Donor Pledged for Blood! ❤️', ?, '#blood')
    `).run(
      bloodReq.requester_id,
      `${authUser.name} has stepped forward to donate blood for ${bloodReq.patient_name} (${bloodReq.blood_group})!`,
      '#blood'
    );

    res.status(201).json({ success: true, message: 'Thank you for your generous pledge to save a life!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4.3 Resource & Material Donations
app.get('/api/resources', (req, res) => {
  try {
    const { type, category } = req.query;
    let query = `
      SELECT ri.*, u.name as user_name, u.avatar as user_avatar, u.phone as contact_phone
      FROM resource_items ri
      JOIN users u ON ri.user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    if (type && type !== 'All') {
      query += ` AND ri.type = ?`;
      params.push(type);
    }
    if (category && category !== 'All') {
      query += ` AND ri.category = ?`;
      params.push(category);
    }
    query += ` ORDER BY ri.created_at DESC`;
    const items = db.prepare(query).all(...params);
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/resources', (req, res) => {
  try {
    const authUser = getAuthUser(req);
    const { type, category, title, description, item_condition = 'Good', quantity = '1', city, area } = req.body;

    if (!type || !category || !title || !description) {
      return res.status(400).json({ error: 'Type, category, title, and description are required' });
    }

    const result = db.prepare(`
      INSERT INTO resource_items (user_id, type, category, title, description, item_condition, quantity, city, area)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(authUser.id, type, category, title, description, item_condition, quantity, city || authUser.city, area || authUser.area);

    res.status(201).json({ success: true, id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ====================================================================
// MODULE 5: COMMUNICATION, NOTIFICATIONS, TRUST & SAFETY
// ====================================================================

// 5.1 In-App Messages
app.get('/api/messages/:requestId', (req, res) => {
  try {
    const requestId = req.params.requestId;
    const messages = db.prepare(`
      SELECT m.*, u.name as sender_name, u.avatar as sender_avatar
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.request_id = ?
      ORDER BY m.created_at ASC
    `).all(requestId);
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/messages', (req, res) => {
  try {
    const authUser = getAuthUser(req);
    const { request_id, receiver_id, message } = req.body;
    if (!message || !message.trim()) return res.status(400).json({ error: 'Message cannot be empty' });

    const result = db.prepare(`
      INSERT INTO messages (request_id, sender_id, receiver_id, message)
      VALUES (?, ?, ?, ?)
    `).run(request_id || null, authUser.id, receiver_id || null, message);

    if (receiver_id) {
      db.prepare(`
        INSERT INTO notifications (user_id, title, message, link)
        VALUES (?, 'New Message from ' || ?, ?, ?)
      `).run(receiver_id, authUser.name, message.length > 50 ? message.slice(0, 47) + '...' : message, `#chat-${request_id}`);
    }

    res.status(201).json({ success: true, id: result.lastInsertRowid, message: {
      id: result.lastInsertRowid,
      request_id,
      sender_id: authUser.id,
      sender_name: authUser.name,
      sender_avatar: authUser.avatar,
      message,
      created_at: new Date().toISOString()
    }});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5.2 Notifications
app.get('/api/notifications', (req, res) => {
  try {
    const authUser = getAuthUser(req);
    const notifications = db.prepare(`
      SELECT * FROM notifications
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 20
    `).all(authUser.id);
    const unreadCount = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0').get(authUser.id).count;
    res.json({ notifications, unreadCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/notifications/mark-read', (req, res) => {
  try {
    const authUser = getAuthUser(req);
    db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(authUser.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5.3 Reviews, Ratings & Reputation
app.post('/api/reviews', (req, res) => {
  try {
    const authUser = getAuthUser(req);
    const { request_id, reviewee_id, rating, feedback } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    db.prepare(`
      INSERT INTO reviews (request_id, reviewer_id, reviewee_id, rating, feedback)
      VALUES (?, ?, ?, ?, ?)
    `).run(request_id, authUser.id, reviewee_id, rating, feedback || '');

    // Recompute target user rating & reliability score
    const agg = db.prepare('SELECT AVG(rating) as avg_rating, COUNT(*) as total_reviews FROM reviews WHERE reviewee_id = ?').get(reviewee_id);
    const newAvg = Number(agg.avg_rating.toFixed(2));
    const newCount = agg.total_reviews;

    // Reliability calculation formula: base 90 + completion bonus + rating factor
    const newReliability = Math.min(100, Math.round(85 + (newAvg / 5) * 12 + Math.min(3, newCount * 0.5)));

    db.prepare(`
      UPDATE users
      SET rating_avg = ?, rating_count = ?, reliability_score = ?
      WHERE id = ?
    `).run(newAvg, newCount, newReliability, reviewee_id);

    // Notify reviewee
    db.prepare(`
      INSERT INTO notifications (user_id, title, message, link)
      VALUES (?, 'You received a new rating! ⭐', ?, '#profile')
    `).run(reviewee_id, `${authUser.name} rated you ${rating} stars: "${feedback || 'Great work!'}"`);

    res.status(201).json({ success: true, newAvg, newReliability });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5.4 Help Circles
app.get('/api/circles', (req, res) => {
  try {
    const circles = db.prepare(`
      SELECT hc.*, u.name as lead_name, u.avatar as lead_avatar,
             (SELECT COUNT(*) FROM help_circle_members WHERE circle_id = hc.id) as members_count
      FROM help_circles hc
      JOIN users u ON hc.lead_user_id = u.id
      ORDER BY hc.created_at DESC
    `).all();
    res.json(circles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/circles', (req, res) => {
  try {
    const authUser = getAuthUser(req);
    const { title, description, request_id } = req.body;
    if (!title || !description) return res.status(400).json({ error: 'Title and description required' });

    const circleResult = db.prepare(`
      INSERT INTO help_circles (title, description, request_id, lead_user_id)
      VALUES (?, ?, ?, ?)
    `).run(title, description, request_id || null, authUser.id);

    const circleId = circleResult.lastInsertRowid;
    // Add creator as Circle Lead
    db.prepare(`
      INSERT INTO help_circle_members (circle_id, user_id, role)
      VALUES (?, ?, 'Lead')
    `).run(circleId, authUser.id);

    res.status(201).json({ success: true, circleId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/circles/:id/join', (req, res) => {
  try {
    const authUser = getAuthUser(req);
    const circleId = req.params.id;

    const existing = db.prepare('SELECT id FROM help_circle_members WHERE circle_id = ? AND user_id = ?').get(circleId, authUser.id);
    if (existing) return res.status(400).json({ error: 'Already a member of this Help Circle' });

    db.prepare(`
      INSERT INTO help_circle_members (circle_id, user_id, role)
      VALUES (?, ?, 'Volunteer')
    `).run(circleId, authUser.id);

    res.json({ success: true, message: 'Joined Help Circle!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5.5 Disputes & Safety Reporting
app.post('/api/disputes', (req, res) => {
  try {
    const authUser = getAuthUser(req);
    const { reported_user_id, request_id, category, details } = req.body;
    if (!category || !details) return res.status(400).json({ error: 'Category and details are required' });

    const result = db.prepare(`
      INSERT INTO disputes_reports (reporter_id, reported_user_id, request_id, category, details)
      VALUES (?, ?, ?, ?, ?)
    `).run(authUser.id, reported_user_id || null, request_id || null, category, details);

    res.status(201).json({
      success: true,
      reportId: result.lastInsertRowid,
      message: 'Your report has been logged and submitted to the safety moderation team.'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ====================================================================
// MODULE 6: ADMIN DASHBOARD, VERIFICATION & COMMUNITY ANALYTICS
// ====================================================================

// 6.1 Community Metrics & Analytics
app.get('/api/admin/metrics', (req, res) => {
  try {
    const totalUsers = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
    const totalRequests = db.prepare('SELECT COUNT(*) as c FROM help_requests').get().c;
    const completedRequests = db.prepare("SELECT COUNT(*) as c FROM help_requests WHERE status = 'Completed'").get().c;
    const activeRequests = db.prepare("SELECT COUNT(*) as c FROM help_requests WHERE status IN ('Open', 'In Progress', 'Accepted')").get().c;
    const totalNGOs = db.prepare('SELECT COUNT(*) as c FROM ngos').get().c;
    const verifiedNGOs = db.prepare("SELECT COUNT(*) as c FROM ngos WHERE verification_status = 'verified'").get().c;
    const totalBloodRequests = db.prepare('SELECT COUNT(*) as c FROM blood_requests').get().c;
    const totalBloodPledges = db.prepare('SELECT COUNT(*) as c FROM blood_pledges').get().c;
    const totalResources = db.prepare('SELECT COUNT(*) as c FROM resource_items').get().c;
    const openDisputes = db.prepare("SELECT COUNT(*) as c FROM disputes_reports WHERE status = 'Pending'").get().c;

    // Sector breakdown
    const sectorStats = db.prepare(`
      SELECT sector, COUNT(*) as count
      FROM help_requests
      GROUP BY sector
    `).all();

    // Success / Resolution rate
    const resolutionRate = totalRequests > 0 ? Math.round((completedRequests / totalRequests) * 100) : 100;

    res.json({
      totalUsers,
      totalRequests,
      completedRequests,
      activeRequests,
      totalNGOs,
      verifiedNGOs,
      totalBloodRequests,
      totalBloodPledges,
      totalResources,
      openDisputes,
      resolutionRate,
      sectorStats
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6.2 Admin User Management
app.get('/api/admin/users', (req, res) => {
  try {
    const authUser = getAuthUser(req);
    if (authUser.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });

    const users = db.prepare(`
      SELECT id, name, email, role, city, area, is_verified, reliability_score, rating_avg, rating_count, created_at
      FROM users
      ORDER BY id ASC
    `).all();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6.3 Admin Verification Queue
app.get('/api/admin/ngos', (req, res) => {
  try {
    const authUser = getAuthUser(req);
    if (authUser.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });

    const ngos = db.prepare(`
      SELECT n.*, u.name as user_name, u.email as user_email
      FROM ngos n
      JOIN users u ON n.user_id = u.id
      ORDER BY n.created_at DESC
    `).all();
    res.json(ngos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/ngos/:id/verify', (req, res) => {
  try {
    const authUser = getAuthUser(req);
    if (authUser.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });

    const { status } = req.body; // 'verified' or 'rejected'
    if (!['verified', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status must be verified or rejected' });
    }

    db.prepare('UPDATE ngos SET verification_status = ? WHERE id = ?').run(status, req.params.id);

    const ngo = db.prepare('SELECT user_id, org_name FROM ngos WHERE id = ?').get(req.params.id);
    if (ngo) {
      db.prepare('UPDATE users SET is_verified = ? WHERE id = ?').run(status === 'verified' ? 1 : 0, ngo.user_id);
      db.prepare(`
        INSERT INTO notifications (user_id, title, message, link)
        VALUES (?, 'Organization Verification Update', ?, '#profile')
      `).run(ngo.user_id, `Your NGO "${ngo.org_name}" verification status is now: ${status.toUpperCase()}.`);
    }

    res.json({ success: true, status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6.4 Admin Dispute Center
app.get('/api/admin/disputes', (req, res) => {
  try {
    const authUser = getAuthUser(req);
    if (authUser.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });

    const disputes = db.prepare(`
      SELECT d.*,
             u1.name as reporter_name,
             u2.name as reported_name,
             hr.title as request_title
      FROM disputes_reports d
      JOIN users u1 ON d.reporter_id = u1.id
      LEFT JOIN users u2 ON d.reported_user_id = u2.id
      LEFT JOIN help_requests hr ON d.request_id = hr.id
      ORDER BY d.created_at DESC
    `).all();
    res.json(disputes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/disputes/:id/resolve', (req, res) => {
  try {
    const authUser = getAuthUser(req);
    if (authUser.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });

    const { status, admin_resolution } = req.body;
    db.prepare(`
      UPDATE disputes_reports
      SET status = ?, admin_resolution = ?
      WHERE id = ?
    `).run(status || 'Resolved', admin_resolution || 'Reviewed by admin team', req.params.id);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Catch-all to serve single-page app
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start listening
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🤝 HelpMate - Community Assistance Platform Running!`);
  console.log(`🌐 Server available at: http://localhost:${PORT}`);
  console.log(`📦 Relational Database: SQLite (Built-in Node 22)`);
  console.log(`📋 PostgreSQL DDL: database_postgres.sql`);
  console.log(`=======================================================`);
});
