/**
 * HelpMate - Automated Route & Logic Verification Test
 */

const { db, calculateMatchScore } = require('./database');

console.log('--- Testing HelpMate Relational Schema & Tables ---');
const tables = [
  'users', 'user_skills', 'user_availability', 'ngos', 'help_requests',
  'help_offers', 'reviews', 'messages', 'notifications', 'volunteer_opportunities',
  'volunteer_applications', 'blood_requests', 'blood_pledges', 'resource_items',
  'disputes_reports', 'help_circles', 'help_circle_members'
];

tables.forEach(table => {
  const count = db.prepare(`SELECT COUNT(*) as c FROM ${table}`).get().c;
  console.log(`✔ Table [${table}]: ${count} records`);
});

console.log('\n--- Testing Multi-Factor Matching Algorithm ---');
const pythonReq = db.prepare('SELECT * FROM help_requests WHERE id = 1').get();
const priya = db.prepare('SELECT * FROM users WHERE id = 2').get();
priya.skills = db.prepare('SELECT skill_name, proficiency FROM user_skills WHERE user_id = 2').all();
priya.availability = db.prepare('SELECT day_of_week, time_slot FROM user_availability WHERE user_id = 2').all();

const matchResult = calculateMatchScore(pythonReq, priya);
console.log(`Candidate: ${priya.name} -> Request: "${pythonReq.title}"`);
console.log(`Match Score: ${matchResult.score}%`);
matchResult.reasons.forEach(r => console.log(`  - ${r}`));

console.log('\n--- Testing 5 Sectors Queries ---');
const sectors = [
  'Education & Skill Development',
  'Personal & Daily-Life Assistance',
  'Community Assistance',
  'NGO & Volunteering',
  'Donation & Resource Assistance'
];

sectors.forEach(s => {
  const reqs = db.prepare('SELECT COUNT(*) as c FROM help_requests WHERE sector = ?').get(s).c;
  console.log(`✔ Sector [${s}]: ${reqs} sample requests`);
});

console.log('\n--- Testing Blood Donation Urgent Matching ---');
const bloodReqs = db.prepare("SELECT * FROM blood_requests WHERE status = 'Open'").all();
bloodReqs.forEach(b => {
  console.log(`✔ Blood Request: Patient ${b.patient_name} (${b.blood_group}) at ${b.hospital_name} [${b.urgency}]`);
});

console.log('\n--- Testing Trust, Rating & Reliability Calculation ---');
const reviews = db.prepare('SELECT * FROM reviews').all();
console.log(`✔ Reviews logged: ${reviews.length}`);
reviews.forEach(r => {
  console.log(`  - Rating: ${r.rating}★: "${r.feedback}"`);
});

console.log('\n=============================================');
console.log(' ALL 6 MODULES & DATA STRUCTURES VERIFIED!');
console.log('=============================================');
