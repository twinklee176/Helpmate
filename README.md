# HelpMate – “Connecting Needs with the Right Help”
### Software Engineering Lab Project (Comprehensive Web Application)

---

## 📌 1. Project Overview

**HelpMate** is a web-based community assistance platform connecting individuals seeking non-monetary assistance with suitable volunteers, tutors, and NGOs. It eliminates the fragmentation of relying on informal personal contacts, messaging groups, and social media word-of-mouth.

### 🌐 The 5 Major Assistance Sectors:
1. **Education & Skill Development**: Academic tutoring, coding guidance, project debugging, career mentorship.
2. **Personal & Daily-Life Assistance**: Elderly assistance, grocery/errands help, hospital companions, mobility aid.
3. **Community Assistance**: Neighborhood park cleanups, tree plantation drives, local disaster relief.
4. **NGO & Volunteering**: Structured volunteer opportunities, NGO verification, social causes.
5. **Donation & Resource Assistance**: Non-monetary donation of study materials/textbooks, clothing, wheelchairs/medical aids, and **Emergency Blood Donation**.

---

## 🏗️ 2. Environmental & Tech Stack Specifications

- **Frontend**: HTML5, CSS3 (Modern Responsive Design System), JavaScript (ES6+ Modular Architecture).
- **Backend**: Node.js & Express.
- **Database**:
  - Relational Database engine via built-in `node:sqlite` (zero-setup, runs out of the box).
  - Production PostgreSQL DDL Schema provided in [`database_postgres.sql`](file:///C:/Users/twink/.gemini/antigravity/scratch/helpmate/database_postgres.sql) for viva, grading, and PostgreSQL deployments.
- **Operating System / Platform**: MS Windows, Linux, macOS; Modern web browsers (Chrome, Edge, Firefox).

---

## ⚙️ 3. Multi-Factor Matching Algorithm (Transparent & Explainable)

HelpMate implements an explainable multi-factor scoring algorithm (0 to 100%) that pairs assistance requests with the most compatible helpers:

$$\text{Match Score} = \text{Skill Match (35\%)} + \text{Availability Match (25\%)} + \text{Location \& Radius (20\%)} + \text{Reliability \& Trust (20\%)}$$

1. **Skill Compatibility (Max 35 points)**: Evaluates semantic overlap between required skills and the helper's verified proficiency level (Beginner, Intermediate, Expert).
2. **Availability Alignment (Max 25 points)**: Matches requested day and time slots (Morning, Afternoon, Evening, Weekends) against helper's active schedule.
3. **Location Proximity (Max 20 points)**: Computes geographic compatibility (same neighborhood = 20 pts, same city within helper radius = 15 pts, remote task = 20 pts).
4. **Trust & Reliability (Max 20 points)**: Incorporates community star rating ($R \in [1, 5]$) and automated reliability percentage based on completion track record.

---

## 🚀 4. Quick Start & Execution Guide

### Prerequisites:
- Node.js (v18 or higher; Node v22 tested)
- npm

### Steps to Run:
```bash
# 1. Navigate to the project directory
cd C:\Users\twink\.gemini\antigravity\scratch\helpmate

# 2. Start the server
node server.js
```

### Accessing the Web Application:
Open your browser and navigate to:
```
http://localhost:3000
```

---

## 🎭 5. Pre-Seeded Demo Personas (1-Click Switcher)

To test the application during lab evaluations, use the floating **Demo Role Switcher** at the top:
1. **👨‍🎓 Rahul Sharma (`rahul@example.com`)**: Seeker / CS student in Rohini looking for Data Structures & Calculus tutoring.
2. **👩‍💻 Priya Patel (`priya@example.com`)**: Verified Top Helper (5.0★ rating, 98% reliability) proficient in Python and Mathematics.
3. **🏃‍♂️ Amit Verma (`amit@example.com`)**: Community volunteer offering elderly assistance and neighborhood errands.
4. **🏢 CareIndia Foundation (`careindia@ngo.org`)**: Verified NGO managing volunteer drives and digital literacy camps.
5. **🛡️ Dr. Sameer Khan (`admin@helpmate.org`)**: Platform Administrator with access to NGO verification queues, content moderation, dispute resolution, and community analytics.

---

## 📋 6. Sprint Mapping & Functional Modules (172 Story Points)

| Module | Sprint | Stories | Points | Key Features |
|---|:---:|:---:|:---:|---|
| **1. User & Profile Management** | 1 | 1 - 5 | 21 | Registration, authentication, role access, skill management, availability slots, location radius, privacy masking. |
| **2. Help Request & Assistance Management** | 2 | 6 - 10 | 19 | 5 sector request creation, lifecycle workflow (`Draft` → `Open` → `Accepted` → `In Progress` → `Completed`), helper selection. |
| **3. Education, Skills & Help Discovery** | 3 | 11 - 16 | 34 | Discovery feed, full-text search, multi-factor matching engine, explainable AI recommendation breakdown modal. |
| **4. NGO, Volunteering & Blood/Resource Donation** | 4 | 17 - 23 | 36 | NGO drives, volunteer applications, emergency blood requests with blood group filters & donor pledges, resource sharing. |
| **5. Communication, Notifications, Trust & Safety** | 5 | 24 - 29 | 31 | In-app messaging channels, real-time notifications, 5-star ratings, reliability scores, Help Circles, dispute reporting. |
| **6. Admin Dashboard & Community Analytics** | 6 | 30 - 34 | 31 | KPI metrics, sector distribution doughnut chart, resolution index gauge, NGO verification queue, safety moderation. |
| **TOTAL** | **6 Sprints** | **34 Stories** | **172 Points** | **Fully Implemented** |

---

## 📂 7. Project File Structure

```
helpmate/
├── package.json                   # Project manifest and dependencies
├── server.js                      # Express API server handling all 6 modules
├── database.js                    # Relational SQLite database manager, schemas & seed data
├── database_postgres.sql          # Standard PostgreSQL DDL schema & queries
├── README.md                      # Complete project documentation & SRS
└── public/
    ├── index.html                 # Single-page web application interface
    ├── css/
    │   └── styles.css             # Responsive design system & themes
    └── js/
        ├── app.js                 # Frontend application router, state & API controller
        ├── matching.js            # Multi-factor matching explainability visualizer
        └── charts.js              # Native SVG/Canvas Community Analytics charts
```
