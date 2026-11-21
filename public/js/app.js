/**
 * HelpMate - Core Application Frontend Script
 * Software Engineering Lab Project Implementation (Sprint 1 to Sprint 6)
 */

const App = {
  currentUser: null,
  activeView: 'requests-view',
  selectedSector: 'All',
  selectedRating: 5,
  activeChatRequestId: null,
  activeChatReceiverId: null,

  async init() {
    this.bindEvents();
    // Initialize default demo user (Rahul Sharma)
    await this.switchDemoUser('rahul');
    this.loadNotifications();
    this.loadRequests();
    this.loadAdminMetricsSummary();
  },

  // Setup UI event listeners
  bindEvents() {
    // Nav links
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        const viewId = link.getAttribute('data-view');
        if (viewId) {
          e.preventDefault();
          this.switchView(viewId);
        }
      });
    });

    // Sector pills
    document.querySelectorAll('.sector-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('.sector-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        this.selectedSector = pill.getAttribute('data-sector');
        this.loadRequests();
      });
    });

    // Search and filter inputs
    const searchInput = document.getElementById('requestSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', () => this.debounce(this.loadRequests(), 300));
    }

    const urgencySelect = document.getElementById('urgencyFilterSelect');
    if (urgencySelect) {
      urgencySelect.addEventListener('change', () => this.loadRequests());
    }

    const cityInput = document.getElementById('cityFilterInput');
    if (cityInput) {
      cityInput.addEventListener('input', () => this.debounce(this.loadRequests(), 300));
    }

    // Star rating picker
    document.querySelectorAll('.star-picker .star').forEach(star => {
      star.addEventListener('click', () => {
        const rating = parseInt(star.getAttribute('data-val'), 10);
        this.selectedRating = rating;
        document.querySelectorAll('.star-picker .star').forEach(s => {
          const val = parseInt(s.getAttribute('data-val'), 10);
          if (val <= rating) s.classList.add('active');
          else s.classList.remove('active');
        });
      });
    });
  },

  // Switch Active View
  switchView(viewId) {
    this.activeView = viewId;
    document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active-view'));
    const target = document.getElementById(viewId);
    if (target) target.classList.add('active-view');

    document.querySelectorAll('.nav-link').forEach(l => {
      if (l.getAttribute('data-view') === viewId) l.classList.add('active');
      else l.classList.remove('active');
    });

    // View specific data loaders
    if (viewId === 'requests-view') this.loadRequests();
    if (viewId === 'discovery-view') this.loadDiscoveryFeed();
    if (viewId === 'blood-view') this.loadBloodRequests();
    if (viewId === 'ngo-view') this.loadNgoOpportunities();
    if (viewId === 'resources-view') this.loadResources();
    if (viewId === 'circles-view') this.loadCircles();
    if (viewId === 'dashboard-view') this.loadDashboard();
    if (viewId === 'admin-view') this.loadAdminPanel();
  },

  // 1-Click Demo User Switcher
  async switchDemoUser(demoKey) {
    try {
      const res = await fetch('/api/auth/switch-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ demoKey })
      });
      const data = await res.json();
      if (data.success) {
        this.currentUser = data.user;
        this.updateUserUI();
        this.showToast(`Switched account to: ${this.currentUser.name} (${this.currentUser.role.toUpperCase()})`, 'info');

        // Update active class on demo pill
        document.querySelectorAll('.demo-btn').forEach(b => {
          if (b.getAttribute('data-demo') === demoKey) b.classList.add('active');
          else b.classList.remove('active');
        });

        // Refresh views
        this.loadNotifications();
        if (this.activeView === 'dashboard-view') this.loadDashboard();
        if (this.activeView === 'admin-view') this.loadAdminPanel();
        if (this.activeView === 'discovery-view') this.loadDiscoveryFeed();
      }
    } catch (e) {
      console.error(e);
    }
  },

  updateUserUI() {
    if (!this.currentUser) return;
    const userRoleEl = document.getElementById('navUserRole');
    const userNameEl = document.getElementById('navUserName');
    const userAvatarEl = document.getElementById('navUserAvatar');
    const adminTab = document.getElementById('adminNavTab');

    if (userRoleEl) userRoleEl.textContent = this.currentUser.role.toUpperCase();
    if (userNameEl) userNameEl.textContent = this.currentUser.name;
    if (userAvatarEl) userAvatarEl.textContent = this.currentUser.avatar || '👤';

    // Show/hide Admin tab
    if (adminTab) {
      adminTab.style.display = this.currentUser.role === 'admin' ? 'inline-flex' : 'none';
    }
  },

  // Custom API helper adding current auth user header
  async fetchApi(url, options = {}) {
    options.headers = {
      ...(options.headers || {}),
      'x-user-id': this.currentUser ? this.currentUser.id : 1
    };
    return fetch(url, options);
  },

  // ==================================================================
  // MODULE 2 & 3: HELP REQUESTS, SECTORS & MATCHING
  // ==================================================================
  async loadRequests() {
    const listEl = document.getElementById('requestsGrid');
    if (!listEl) return;

    listEl.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding: 40px; color:#64748b;">Loading community assistance requests...</div>';

    const search = document.getElementById('requestSearchInput')?.value || '';
    const urgency = document.getElementById('urgencyFilterSelect')?.value || 'All';
    const city = document.getElementById('cityFilterInput')?.value || '';

    const params = new URLSearchParams({
      sector: this.selectedSector,
      search,
      urgency,
      city
    });

    try {
      const res = await this.fetchApi(`/api/requests?${params.toString()}`);
      const requests = await res.json();

      if (!requests || requests.length === 0) {
        listEl.innerHTML = `
          <div style="grid-column: 1/-1; text-align:center; padding: 50px 20px; background:white; border-radius:12px; border:1px dashed #cbd5e1;">
            <span style="font-size:2.5rem;">🔍</span>
            <h3 style="margin-top:10px; color:#1e293b;">No requests found</h3>
            <p style="color:#64748b; font-size:0.9rem;">No help requests currently match the selected sector or search criteria.</p>
            <button class="btn btn-primary btn-sm" style="margin-top:14px;" onclick="App.openCreateRequestModal()">+ Post a Help Request</button>
          </div>
        `;
        return;
      }

      listEl.innerHTML = requests.map(req => {
        let tagClass = 'tag-education';
        if (req.sector.includes('Personal')) tagClass = 'tag-personal';
        if (req.sector.includes('Community')) tagClass = 'tag-community';
        if (req.sector.includes('NGO')) tagClass = 'tag-ngo';
        if (req.sector.includes('Donation')) tagClass = 'tag-donation';

        const skillsArr = (req.required_skills || '').split(',').map(s => s.trim()).filter(Boolean);

        return `
          <div class="request-card" onclick="App.openRequestDetailsModal(${req.id})">
            <div>
              <div class="card-header-top">
                <span class="sector-tag ${tagClass}">${req.sector.split('&')[0]}</span>
                <span class="urgency-badge urgency-${req.urgency}">${req.urgency}</span>
              </div>
              <h3 class="card-title">${this.escapeHtml(req.title)}</h3>
              <p class="card-description">${this.escapeHtml(req.description)}</p>

              <div class="card-meta-list">
                <div class="meta-row">
                  <span class="meta-icon">📍</span>
                  <span>${req.is_remote ? '🌐 Remote / Online' : `${req.area}, ${req.city}`}</span>
                </div>
                <div class="meta-row">
                  <span class="meta-icon">⏰</span>
                  <span>${req.date_time || 'Flexible'} (${req.duration || '1-2 hrs'})</span>
                </div>
                <div class="meta-row">
                  <span class="meta-icon">👥</span>
                  <span>Needs ${req.helpers_needed} Helper(s) • <strong>${req.status}</strong></span>
                </div>
              </div>

              ${skillsArr.length > 0 ? `
                <div class="skills-chips">
                  ${skillsArr.map(s => `<span class="skill-chip">🏷️ ${s}</span>`).join('')}
                </div>
              ` : ''}
            </div>

            <div class="card-footer">
              <div class="requester-info">
                <div class="avatar-bubble">${req.requester_avatar || '👤'}</div>
                <div>
                  <div class="requester-name">${this.escapeHtml(req.requester_name)}</div>
                  <div class="requester-sub">⭐ ${req.requester_rating} • ${req.requester_reliability}% Trust</div>
                </div>
              </div>
              <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); App.openRequestDetailsModal(${req.id})">
                View & Offer
              </button>
            </div>
          </div>
        `;
      }).join('');
    } catch (e) {
      console.error(e);
      listEl.innerHTML = '<div style="grid-column: 1/-1; color:red; text-align:center;">Failed to load requests.</div>';
    }
  },

  // Open Request Details & Offers Modal
  async openRequestDetailsModal(requestId) {
    try {
      const res = await this.fetchApi(`/api/requests/${requestId}`);
      const data = await res.json();
      if (!data.request) return;

      const req = data.request;
      const offers = data.offers || [];
      const isOwner = this.currentUser && this.currentUser.id === req.user_id;

      let offersHtml = '';
      if (offers.length > 0) {
        offersHtml = `
          <div style="margin-top: 20px;">
            <h4 style="font-size: 1.05rem; color:#1e293b; margin-bottom: 12px; font-weight:700;">
              Received Help Offers (${offers.length})
            </h4>
            <div style="display:flex; flex-direction:column; gap:12px;">
              ${offers.map(o => `
                <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:14px;">
                  <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:6px;">
                    <div style="display:flex; align-items:center; gap:8px;">
                      <span style="font-size:1.3rem;">${o.helper_avatar || '👩‍💻'}</span>
                      <div>
                        <strong style="color:#0f172a; font-size:0.9rem;">${o.helper_name}</strong>
                        <span style="font-size:0.75rem; color:#64748b; margin-left:6px;">⭐ ${o.helper_rating} (${o.helper_reliability}% Reliability)</span>
                      </div>
                    </div>
                    ${window.MatchingEngine.renderBadge(o.match_score, o.match_reasons)}
                  </div>
                  <p style="font-size:0.85rem; color:#334155; margin-bottom:10px;">"${this.escapeHtml(o.message)}"</p>
                  
                  <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px dashed #cbd5e1; padding-top:8px;">
                    <span style="font-size:0.75rem; font-weight:600; color:${o.status === 'Accepted' ? '#16a34a' : '#64748b'};">
                      Status: ${o.status}
                    </span>
                    <div style="display:flex; gap:6px;">
                      ${isOwner && o.status === 'Pending' ? `
                        <button class="btn btn-success btn-sm" onclick="App.acceptOffer(${o.id})">✔ Accept Helper</button>
                      ` : ''}
                      ${(isOwner || (this.currentUser && this.currentUser.id === o.helper_id)) ? `
                        <button class="btn btn-secondary btn-sm" onclick="App.openChatModal(${req.id}, ${isOwner ? o.helper_id : req.user_id}, '${this.escapeHtml(isOwner ? o.helper_name : req.requester_name)}')">
                          💬 Message
                        </button>
                      ` : ''}
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      } else {
        offersHtml = `
          <div style="margin-top: 18px; padding:16px; background:#f8fafc; border-radius:8px; text-align:center; color:#64748b; font-size:0.88rem;">
            No volunteers have applied yet. Be the first to offer assistance!
          </div>
        `;
      }

      const modalBody = document.getElementById('requestDetailsModalBody');
      modalBody.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <span class="sector-tag tag-education">${req.sector}</span>
          <span class="urgency-badge urgency-${req.urgency}">${req.urgency} Urgency</span>
        </div>
        <h2 style="font-size: 1.35rem; color:#0f172a; margin-bottom: 8px;">${this.escapeHtml(req.title)}</h2>
        <p style="color:#475569; font-size: 0.95rem; line-height:1.6; margin-bottom:16px;">${this.escapeHtml(req.description)}</p>

        <div style="background:#f1f5f9; padding:14px; border-radius:8px; font-size:0.85rem; display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:16px;">
          <div>📍 <strong>Location:</strong> ${req.is_remote ? 'Remote / Online' : `${req.area}, ${req.city}`}</div>
          <div>⏰ <strong>Schedule:</strong> ${req.date_time || 'Flexible'} (${req.duration})</div>
          <div>👤 <strong>Requester:</strong> ${this.escapeHtml(req.requester_name)} (⭐ ${req.requester_rating})</div>
          <div>🔄 <strong>Status:</strong> <span style="font-weight:700; color:#2563eb;">${req.status}</span></div>
          ${req.required_skills ? `<div style="grid-column: 1/-1;">🏷️ <strong>Required Skills:</strong> ${this.escapeHtml(req.required_skills)}</div>` : ''}
        </div>

        <!-- Action Row -->
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-top:10px;">
          ${!isOwner && req.status === 'Open' ? `
            <button class="btn btn-primary" onclick="App.openOfferHelpModal(${req.id}, '${this.escapeHtml(req.title)}')">
              🤝 Offer Assistance
            </button>
          ` : ''}

          ${isOwner && (req.status === 'Accepted' || req.status === 'In Progress') ? `
            <button class="btn btn-success" onclick="App.completeRequest(${req.id})">
              ⭐ Mark Assistance Completed
            </button>
          ` : ''}

          <div style="display:flex; gap:6px;">
            <button class="btn btn-secondary btn-sm" onclick="App.openReportModal(${req.user_id}, ${req.id})">
              ⚠️ Report Issue
            </button>
          </div>
        </div>

        ${offersHtml}
      `;

      document.getElementById('requestDetailsModal').classList.add('active');
    } catch (e) {
      console.error(e);
    }
  },

  // Post Help Request Modal
  openCreateRequestModal() {
    document.getElementById('createRequestModal').classList.add('active');
  },

  async submitHelpRequest(e) {
    e.preventDefault();
    const form = e.target;
    const body = {
      title: form.title.value,
      sector: form.sector.value,
      description: form.description.value,
      required_skills: form.required_skills.value,
      urgency: form.urgency.value,
      date_time: form.date_time.value,
      duration: form.duration.value,
      city: form.city.value,
      area: form.area.value,
      is_remote: form.is_remote.checked ? 1 : 0,
      helpers_needed: parseInt(form.helpers_needed.value || 1, 10)
    };

    try {
      const res = await this.fetchApi('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.success) {
        this.showToast('Help Request published to the community!', 'success');
        document.getElementById('createRequestModal').classList.remove('active');
        form.reset();
        this.loadRequests();
      } else {
        this.showToast(data.error || 'Failed to submit request', 'error');
      }
    } catch (err) {
      console.error(err);
    }
  },

  // Offer Help Modal
  openOfferHelpModal(requestId, title) {
    document.getElementById('offerModalRequestId').value = requestId;
    document.getElementById('offerModalRequestTitle').textContent = `Offering Help for: "${title}"`;
    document.getElementById('offerHelpModal').classList.add('active');
  },

  async submitHelpOffer(e) {
    e.preventDefault();
    const form = e.target;
    const requestId = form.requestId.value;
    const message = form.message.value;

    try {
      const res = await this.fetchApi(`/api/requests/${requestId}/offers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });
      const data = await res.json();
      if (data.success) {
        this.showToast(`Offer submitted! Calculated Match Score: ${data.matchScore}%`, 'success');
        document.getElementById('offerHelpModal').classList.remove('active');
        document.getElementById('requestDetailsModal').classList.remove('active');
        this.loadRequests();
      } else {
        this.showToast(data.error || 'Failed to submit offer', 'error');
      }
    } catch (err) {
      console.error(err);
    }
  },

  async acceptOffer(offerId) {
    try {
      const res = await this.fetchApi(`/api/offers/${offerId}/accept`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        this.showToast('Helper accepted! In-app chat channel opened.', 'success');
        document.getElementById('requestDetailsModal').classList.remove('active');
        this.loadRequests();
      }
    } catch (e) {
      console.error(e);
    }
  },

  async completeRequest(requestId) {
    try {
      const res = await this.fetchApi(`/api/requests/${requestId}/complete`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        this.showToast('Assistance marked as completed! Please leave a review.', 'success');
        document.getElementById('requestDetailsModal').classList.remove('active');
        this.loadRequests();
        this.openReviewModal(requestId, 2); // Default to review helper
      }
    } catch (e) {
      console.error(e);
    }
  },

  // Review & Rating Modal
  openReviewModal(requestId, revieweeId) {
    document.getElementById('reviewRequestId').value = requestId;
    document.getElementById('reviewRevieweeId').value = revieweeId;
    document.getElementById('reviewModal').classList.add('active');
  },

  async submitReview(e) {
    e.preventDefault();
    const form = e.target;
    const body = {
      request_id: parseInt(form.requestId.value, 10),
      reviewee_id: parseInt(form.revieweeId.value, 10),
      rating: this.selectedRating,
      feedback: form.feedback.value
    };

    try {
      const res = await this.fetchApi('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.success) {
        this.showToast('Thank you! Your feedback promotes trust in the community.', 'success');
        document.getElementById('reviewModal').classList.remove('active');
      }
    } catch (err) {
      console.error(err);
    }
  },

  // ==================================================================
  // MODULE 3: PERSONALIZED DISCOVERY & MULTI-FACTOR MATCHING
  // ==================================================================
  async loadDiscoveryFeed() {
    const listEl = document.getElementById('recommendationsGrid');
    const helperListEl = document.getElementById('topHelpersList');
    if (!listEl) return;

    listEl.innerHTML = '<div style="text-align:center; padding:30px; color:#64748b;">Evaluating multi-factor algorithm against your skills & availability...</div>';

    try {
      // 1. Personalized Request Recommendations
      const res = await this.fetchApi('/api/matching/recommendations');
      const requests = await res.json();

      if (!requests || requests.length === 0) {
        listEl.innerHTML = '<p style="color:#64748b; text-align:center; padding:20px;">No requests match your profile criteria yet. Add more skills to get recommendations!</p>';
      } else {
        listEl.innerHTML = requests.slice(0, 8).map(req => `
          <div style="background:white; border:1px solid #e2e8f0; border-radius:12px; padding:16px; margin-bottom:12px; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
              <div>
                <span class="sector-tag tag-education" style="font-size:0.7rem;">${req.sector}</span>
                <h4 style="font-size:1.05rem; color:#0f172a; margin-top:4px;">${this.escapeHtml(req.title)}</h4>
              </div>
              ${window.MatchingEngine.renderBadge(req.matchScore, req.matchReasons)}
            </div>
            <p style="font-size:0.85rem; color:#475569; margin-bottom:10px;">${this.escapeHtml(req.description)}</p>
            <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.8rem; color:#64748b;">
              <span>📍 ${req.area}, ${req.city}</span>
              <button class="btn btn-primary btn-sm" onclick="App.openRequestDetailsModal(${req.id})">Offer Assistance</button>
            </div>
          </div>
        `).join('');
      }

      // 2. Discover Top Helpers in community
      if (helperListEl) {
        const helperRes = await this.fetchApi('/api/users/helpers');
        const helpers = await helperRes.json();
        helperListEl.innerHTML = helpers.map(h => `
          <div style="background:white; border:1px solid #e2e8f0; border-radius:12px; padding:16px; display:flex; gap:12px; align-items:center;">
            <div style="font-size:2rem; width:48px; height:48px; border-radius:50%; background:#f1f5f9; display:flex; align-items:center; justify-content:center;">
              ${h.avatar || '👩‍🏫'}
            </div>
            <div style="flex:1;">
              <div style="display:flex; align-items:center; gap:6px;">
                <strong style="color:#0f172a; font-size:0.95rem;">${this.escapeHtml(h.name)}</strong>
                ${h.is_verified ? '<span title="Verified Helper" style="color:#10b981;">✔</span>' : ''}
              </div>
              <div style="font-size:0.8rem; color:#64748b; margin-top:2px;">
                ⭐ ${h.rating_avg} (${h.rating_count} reviews) • <span style="color:#10b981; font-weight:600;">${h.reliability_score}% Reliability</span>
              </div>
              <div style="font-size:0.75rem; color:#475569; margin-top:4px;">
                📍 ${h.area}, ${h.city} (within ${h.radius_km} km)
              </div>
              <div style="display:flex; gap:4px; flex-wrap:wrap; margin-top:6px;">
                ${(h.skills || []).map(s => `<span class="skill-chip" style="font-size:0.7rem;">${s.skill_name} (${s.proficiency})</span>`).join('')}
              </div>
            </div>
          </div>
        `).join('');
      }
    } catch (e) {
      console.error(e);
    }
  },

  // ==================================================================
  // MODULE 4: NGO OPPORTUNITIES, BLOOD & RESOURCE DONATION
  // ==================================================================
  async loadBloodRequests() {
    const listEl = document.getElementById('bloodRequestsList');
    if (!listEl) return;

    const bloodGroup = document.getElementById('bloodGroupFilter')?.value || 'All';
    try {
      const res = await this.fetchApi(`/api/blood/requests?blood_group=${bloodGroup}`);
      const list = await res.json();

      if (!list || list.length === 0) {
        listEl.innerHTML = '<div style="text-align:center; padding:30px; color:#64748b;">No active emergency blood requests.</div>';
        return;
      }

      listEl.innerHTML = list.map(b => `
        <div class="blood-alert-card">
          <div style="display:flex; align-items:center; gap:16px;">
            <div class="blood-group-badge">${b.blood_group}</div>
            <div class="blood-details">
              <h4>${this.escapeHtml(b.patient_name)}</h4>
              <p>🏥 <strong>Hospital:</strong> ${this.escapeHtml(b.hospital_name)} (${b.area}, ${b.city})</p>
              <p>🩸 <strong>Units Needed:</strong> ${b.units_needed} Unit(s) • <span style="color:#dc2626; font-weight:700;">${b.urgency}</span></p>
              <p style="font-size:0.78rem; color:#64748b;">Pledges: ${b.pledges_count} Donors Stepped Forward</p>
            </div>
          </div>
          <div style="display:flex; gap:8px;">
            <button class="btn btn-danger" onclick="App.openBloodPledgeModal(${b.id}, '${b.patient_name}', '${b.blood_group}')">
              ❤️ I Can Donate / Pledge
            </button>
          </div>
        </div>
      `).join('');
    } catch (e) {
      console.error(e);
    }
  },

  openCreateBloodModal() {
    document.getElementById('createBloodModal').classList.add('active');
  },

  async submitBloodRequest(e) {
    e.preventDefault();
    const form = e.target;
    const body = {
      patient_name: form.patient_name.value,
      blood_group: form.blood_group.value,
      units_needed: parseInt(form.units_needed.value || 1, 10),
      hospital_name: form.hospital_name.value,
      city: form.city.value,
      area: form.area.value,
      urgency: form.urgency.value,
      contact_phone: form.contact_phone.value
    };

    try {
      const res = await this.fetchApi('/api/blood/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.success) {
        this.showToast('Urgent Blood Alert broadcasted to community!', 'success');
        document.getElementById('createBloodModal').classList.remove('active');
        form.reset();
        this.loadBloodRequests();
      }
    } catch (e) {
      console.error(e);
    }
  },

  openBloodPledgeModal(requestId, patientName, bloodGroup) {
    document.getElementById('bloodPledgeRequestId').value = requestId;
    document.getElementById('bloodPledgeTitle').textContent = `Pledging ${bloodGroup} Blood for ${patientName}`;
    document.getElementById('bloodPledgeModal').classList.add('active');
  },

  async submitBloodPledge(e) {
    e.preventDefault();
    const form = e.target;
    const requestId = form.requestId.value;
    const note = form.note.value;

    try {
      const res = await this.fetchApi(`/api/blood/requests/${requestId}/pledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note })
      });
      const data = await res.json();
      if (data.success) {
        this.showToast('Thank you! You are a life saver.', 'success');
        document.getElementById('bloodPledgeModal').classList.remove('active');
        this.loadBloodRequests();
      }
    } catch (e) {
      console.error(e);
    }
  },

  async loadNgoOpportunities() {
    const listEl = document.getElementById('ngoOpportunitiesGrid');
    if (!listEl) return;

    try {
      const res = await this.fetchApi('/api/ngo/opportunities');
      const opps = await res.json();

      if (!opps || opps.length === 0) {
        listEl.innerHTML = '<p style="color:#64748b; padding:20px; text-align:center;">No volunteer drives active at this moment.</p>';
        return;
      }

      listEl.innerHTML = opps.map(opp => `
        <div class="request-card">
          <div>
            <div class="card-header-top">
              <span class="sector-tag tag-ngo">NGO Initiative</span>
              <span style="font-size:0.75rem; color:#10b981; font-weight:700;">✔ Verified NGO</span>
            </div>
            <h3 class="card-title">${this.escapeHtml(opp.title)}</h3>
            <div style="font-size:0.8rem; font-weight:600; color:#2563eb; margin-bottom:8px;">
              🏢 Organized by: ${this.escapeHtml(opp.org_name)}
            </div>
            <p class="card-description">${this.escapeHtml(opp.description)}</p>

            <div class="card-meta-list">
              <div class="meta-row"><span class="meta-icon">📍</span> ${opp.area}, ${opp.city}</div>
              <div class="meta-row"><span class="meta-icon">📅</span> ${opp.schedule}</div>
              <div class="meta-row"><span class="meta-icon">👥</span> Volunteers: ${opp.volunteers_registered} / ${opp.volunteers_needed} needed</div>
            </div>
          </div>

          <div class="card-footer">
            <span style="font-size:0.75rem; color:#64748b;">${opp.status}</span>
            <button class="btn btn-primary btn-sm" onclick="App.applyForNgoOpportunity(${opp.id})">
              🙋 Join as Volunteer
            </button>
          </div>
        </div>
      `).join('');
    } catch (e) {
      console.error(e);
    }
  },

  async applyForNgoOpportunity(oppId) {
    try {
      const res = await this.fetchApi(`/api/ngo/opportunities/${oppId}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: 'I would love to volunteer for this NGO initiative.' })
      });
      const data = await res.json();
      if (data.success) {
        this.showToast('Volunteer application submitted to NGO!', 'success');
        this.loadNgoOpportunities();
      } else {
        this.showToast(data.error || 'Failed to apply', 'error');
      }
    } catch (e) {
      console.error(e);
    }
  },

  async loadResources() {
    const listEl = document.getElementById('resourcesGrid');
    if (!listEl) return;

    try {
      const res = await this.fetchApi('/api/resources');
      const items = await res.json();

      listEl.innerHTML = items.map(item => `
        <div class="request-card">
          <div>
            <div class="card-header-top">
              <span class="sector-tag tag-donation">${item.type === 'Offer' ? '🎁 Donating / Offering' : '🙏 Requesting'}</span>
              <span style="font-size:0.75rem; font-weight:600; color:#64748b;">${item.item_condition} Condition</span>
            </div>
            <h3 class="card-title">${this.escapeHtml(item.title)}</h3>
            <p class="card-description">${this.escapeHtml(item.description)}</p>
            <div class="card-meta-list">
              <div class="meta-row"><span class="meta-icon">📦</span> Category: ${item.category}</div>
              <div class="meta-row"><span class="meta-icon">🔢</span> Quantity: ${item.quantity}</div>
              <div class="meta-row"><span class="meta-icon">📍</span> Location: ${item.area}, ${item.city}</div>
            </div>
          </div>
          <div class="card-footer">
            <div class="requester-info">
              <span class="avatar-bubble">${item.user_avatar || '👤'}</span>
              <span class="requester-name">${this.escapeHtml(item.user_name)}</span>
            </div>
            <button class="btn btn-secondary btn-sm" onclick="App.showToast('Resource coordinator contacted: ' + '${item.contact_phone || 'Shared in Chat'}', 'info')">
              📞 Connect
            </button>
          </div>
        </div>
      `).join('');
    } catch (e) {
      console.error(e);
    }
  },

  openCreateResourceModal() {
    document.getElementById('createResourceModal').classList.add('active');
  },

  async submitResourceItem(e) {
    e.preventDefault();
    const form = e.target;
    const body = {
      type: form.type.value,
      category: form.category.value,
      title: form.title.value,
      description: form.description.value,
      item_condition: form.item_condition.value,
      quantity: form.quantity.value,
      city: form.city.value,
      area: form.area.value
    };

    try {
      const res = await this.fetchApi('/api/resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.success) {
        this.showToast('Resource entry posted to community hub!', 'success');
        document.getElementById('createResourceModal').classList.remove('active');
        form.reset();
        this.loadResources();
      }
    } catch (e) {
      console.error(e);
    }
  },

  async loadCircles() {
    const listEl = document.getElementById('circlesGrid');
    if (!listEl) return;

    try {
      const res = await this.fetchApi('/api/circles');
      const circles = await res.json();

      listEl.innerHTML = circles.map(c => `
        <div class="request-card">
          <div>
            <div class="card-header-top">
              <span class="sector-tag tag-community">Help Circle</span>
              <span style="font-size:0.75rem; color:#2563eb; font-weight:700;">👥 ${c.members_count} Members</span>
            </div>
            <h3 class="card-title">${this.escapeHtml(c.title)}</h3>
            <p class="card-description">${this.escapeHtml(c.description)}</p>
            <div style="font-size:0.8rem; color:#64748b; margin-top:8px;">
              Circle Lead: <strong>${this.escapeHtml(c.lead_name)}</strong>
            </div>
          </div>
          <div class="card-footer">
            <span style="font-size:0.75rem; color:#10b981; font-weight:600;">Status: Active</span>
            <button class="btn btn-primary btn-sm" onclick="App.joinCircle(${c.id})">Join Circle</button>
          </div>
        </div>
      `).join('');
    } catch (e) {
      console.error(e);
    }
  },

  async joinCircle(circleId) {
    try {
      const res = await this.fetchApi(`/api/circles/${circleId}/join`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        this.showToast('Successfully joined the Help Circle!', 'success');
        this.loadCircles();
      } else {
        this.showToast(data.error || 'Already in circle', 'info');
      }
    } catch (e) {
      console.error(e);
    }
  },

  // ==================================================================
  // MODULE 5: IN-APP COMMUNICATION & NOTIFICATIONS
  // ==================================================================
  async openChatModal(requestId, receiverId, receiverName) {
    this.activeChatRequestId = requestId;
    this.activeChatReceiverId = receiverId;

    document.getElementById('chatRecipientName').textContent = receiverName || 'Community Member';
    document.getElementById('chatModal').classList.add('active');
    this.refreshChatMessages();
  },

  async refreshChatMessages() {
    if (!this.activeChatRequestId) return;
    const historyEl = document.getElementById('chatHistory');
    try {
      const res = await this.fetchApi(`/api/messages/${this.activeChatRequestId}`);
      const messages = await res.json();

      historyEl.innerHTML = messages.map(m => {
        const isOutgoing = this.currentUser && m.sender_id === this.currentUser.id;
        return `
          <div class="message-bubble ${isOutgoing ? 'outgoing' : 'incoming'}">
            <div class="message-sender">${isOutgoing ? 'You' : this.escapeHtml(m.sender_name)}</div>
            <div>${this.escapeHtml(m.message)}</div>
            <div class="message-time">${new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        `;
      }).join('');
      historyEl.scrollTop = historyEl.scrollHeight;
    } catch (e) {
      console.error(e);
    }
  },

  async sendChatMessage(e) {
    e.preventDefault();
    const input = document.getElementById('chatMessageInput');
    const message = input.value.trim();
    if (!message) return;

    try {
      const res = await this.fetchApi('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_id: this.activeChatRequestId,
          receiver_id: this.activeChatReceiverId,
          message
        })
      });
      const data = await res.json();
      if (data.success) {
        input.value = '';
        this.refreshChatMessages();
      }
    } catch (e) {
      console.error(e);
    }
  },

  async loadNotifications() {
    try {
      const res = await this.fetchApi('/api/notifications');
      const data = await res.json();
      const badge = document.getElementById('unreadNotifBadge');
      if (badge) {
        badge.textContent = data.unreadCount || 0;
        badge.style.display = data.unreadCount > 0 ? 'inline-block' : 'none';
      }

      const listEl = document.getElementById('notifDropdownList');
      if (listEl && data.notifications) {
        listEl.innerHTML = data.notifications.map(n => `
          <div style="padding:10px 14px; border-bottom:1px solid #f1f5f9; font-size:0.82rem; background:${n.is_read ? '#fff' : '#f0f9ff'};">
            <div style="font-weight:700; color:#0f172a; margin-bottom:2px;">${this.escapeHtml(n.title)}</div>
            <div style="color:#475569;">${this.escapeHtml(n.message)}</div>
            <div style="font-size:0.68rem; color:#94a3b8; margin-top:4px;">${new Date(n.created_at).toLocaleString()}</div>
          </div>
        `).join('');
      }
    } catch (e) {
      console.error(e);
    }
  },

  toggleNotifDropdown() {
    const el = document.getElementById('notifDropdown');
    if (!el) return;
    const isShowing = el.style.display === 'block';
    el.style.display = isShowing ? 'none' : 'block';
    if (!isShowing) {
      this.fetchApi('/api/notifications/mark-read', { method: 'POST' });
      const badge = document.getElementById('unreadNotifBadge');
      if (badge) badge.style.display = 'none';
    }
  },

  // Safety & Disputes
  openReportModal(reportedUserId, requestId) {
    document.getElementById('reportTargetUserId').value = reportedUserId || '';
    document.getElementById('reportRequestId').value = requestId || '';
    document.getElementById('reportModal').classList.add('active');
  },

  async submitReport(e) {
    e.preventDefault();
    const form = e.target;
    const body = {
      reported_user_id: form.reportedUserId.value ? parseInt(form.reportedUserId.value, 10) : null,
      request_id: form.requestId.value ? parseInt(form.requestId.value, 10) : null,
      category: form.category.value,
      details: form.details.value
    };

    try {
      const res = await this.fetchApi('/api/disputes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.success) {
        this.showToast('Report submitted to safety moderation team.', 'info');
        document.getElementById('reportModal').classList.remove('active');
        form.reset();
      }
    } catch (e) {
      console.error(e);
    }
  },

  // ==================================================================
  // MODULE 6: USER DASHBOARD, ADMIN & COMMUNITY ANALYTICS
  // ==================================================================
  async loadDashboard() {
    if (!this.currentUser) return;
    try {
      const res = await this.fetchApi(`/api/users/profile/${this.currentUser.id}`);
      const data = await res.json();

      document.getElementById('dashUserName').textContent = data.user.name;
      document.getElementById('dashUserBio').textContent = data.user.bio || 'Community member dedicated to mutual assistance.';
      document.getElementById('dashTrustScore').textContent = `${data.user.reliability_score}%`;
      document.getElementById('dashRatingAvg').textContent = `${data.user.rating_avg} ★`;
      document.getElementById('dashLocation').textContent = `${data.user.area}, ${data.user.city} (Radius: ${data.user.radius_km} km)`;

      // Render User Skills
      const skillsEl = document.getElementById('dashSkillsList');
      if (skillsEl) {
        skillsEl.innerHTML = (data.skills || []).map(s => `
          <span class="skill-chip" style="font-size:0.8rem; padding:4px 8px;">
            ${s.skill_name} (${s.proficiency})
            <span style="cursor:pointer; color:#ef4444; margin-left:4px;" onclick="App.deleteSkill(${s.id})">×</span>
          </span>
        `).join('') + `
          <button class="btn btn-secondary btn-sm" onclick="App.openAddSkillModal()">+ Add Skill</button>
        `;
      }

      // Render User Availability
      const availEl = document.getElementById('dashAvailabilityList');
      if (availEl) {
        availEl.innerHTML = (data.availability || []).map(a => `
          <div style="background:#f8fafc; border:1px solid #e2e8f0; padding:6px 12px; border-radius:6px; font-size:0.85rem; display:flex; justify-content:space-between; margin-bottom:6px;">
            <span>🗓️ <strong>${a.day_of_week}:</strong> ${a.time_slot} (${a.preferred_duration})</span>
            <span style="cursor:pointer; color:#ef4444;" onclick="App.deleteAvailability(${a.id})">×</span>
          </div>
        `).join('') + `
          <button class="btn btn-secondary btn-sm" onclick="App.openAddAvailabilityModal()">+ Add Time Slot</button>
        `;
      }

      // Render My Requests
      const myReqsRes = await this.fetchApi('/api/requests?my_requests=true');
      const myReqs = await myReqsRes.json();
      const myReqsEl = document.getElementById('dashMyRequestsList');
      if (myReqsEl) {
        if (!myReqs || myReqs.length === 0) {
          myReqsEl.innerHTML = '<p style="color:#64748b; font-size:0.85rem;">You haven\'t posted any help requests yet.</p>';
        } else {
          myReqsEl.innerHTML = myReqs.map(r => `
            <div style="background:white; border:1px solid #e2e8f0; border-radius:8px; padding:12px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
              <div>
                <strong style="font-size:0.9rem; color:#0f172a;">${this.escapeHtml(r.title)}</strong>
                <div style="font-size:0.75rem; color:#64748b;">${r.sector} • Offers: ${r.offers_count}</div>
              </div>
              <div style="display:flex; align-items:center; gap:8px;">
                <span class="urgency-badge" style="background:#e0f2fe; color:#0369a1;">${r.status}</span>
                <button class="btn btn-secondary btn-sm" onclick="App.openRequestDetailsModal(${r.id})">Details</button>
              </div>
            </div>
          `).join('');
        }
      }

      // Render Received Reviews
      const reviewsEl = document.getElementById('dashReviewsList');
      if (reviewsEl) {
        if (!data.reviews || data.reviews.length === 0) {
          reviewsEl.innerHTML = '<p style="color:#64748b; font-size:0.85rem;">No reviews yet. Complete assistance requests to earn ratings!</p>';
        } else {
          reviewsEl.innerHTML = data.reviews.map(rev => `
            <div style="background:white; border:1px solid #e2e8f0; border-radius:8px; padding:12px; margin-bottom:8px;">
              <div style="display:flex; justify-content:space-between; font-size:0.8rem; margin-bottom:4px;">
                <strong>${this.escapeHtml(rev.reviewer_name)}</strong>
                <span style="color:#eab308;">${'★'.repeat(rev.rating)}</span>
              </div>
              <p style="font-size:0.85rem; color:#475569;">"${this.escapeHtml(rev.feedback)}"</p>
            </div>
          `).join('');
        }
      }
    } catch (e) {
      console.error(e);
    }
  },

  async deleteSkill(id) {
    await this.fetchApi(`/api/users/skills/${id}`, { method: 'DELETE' });
    this.loadDashboard();
  },

  async deleteAvailability(id) {
    await this.fetchApi(`/api/users/availability/${id}`, { method: 'DELETE' });
    this.loadDashboard();
  },

  openAddSkillModal() {
    document.getElementById('addSkillModal').classList.add('active');
  },

  async submitAddSkill(e) {
    e.preventDefault();
    const form = e.target;
    await this.fetchApi('/api/users/skills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        skill_name: form.skill_name.value,
        proficiency: form.proficiency.value,
        experience_years: parseInt(form.experience_years.value || 1, 10)
      })
    });
    document.getElementById('addSkillModal').classList.remove('active');
    form.reset();
    this.loadDashboard();
  },

  openAddAvailabilityModal() {
    document.getElementById('addAvailModal').classList.add('active');
  },

  async submitAddAvailability(e) {
    e.preventDefault();
    const form = e.target;
    await this.fetchApi('/api/users/availability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        day_of_week: form.day_of_week.value,
        time_slot: form.time_slot.value,
        preferred_duration: form.preferred_duration.value
      })
    });
    document.getElementById('addAvailModal').classList.remove('active');
    form.reset();
    this.loadDashboard();
  },

  // Admin Panel
  async loadAdminPanel() {
    if (this.currentUser?.role !== 'admin') {
      this.showToast('Admin role required', 'error');
      return;
    }

    try {
      // 1. Metrics & Charts
      const metricsRes = await this.fetchApi('/api/admin/metrics');
      const metrics = await metricsRes.json();

      document.getElementById('admTotalUsers').textContent = metrics.totalUsers;
      document.getElementById('admTotalRequests').textContent = metrics.totalRequests;
      document.getElementById('admResolutionRate').textContent = `${metrics.resolutionRate}%`;
      document.getElementById('admBloodPledges').textContent = metrics.totalBloodPledges;
      document.getElementById('admPendingDisputes').textContent = metrics.openDisputes;

      // Render Charts
      window.CommunityCharts.renderSectorDoughnut('adminSectorChart', metrics.sectorStats);
      window.CommunityCharts.renderSuccessGauge('adminSuccessGauge', metrics.resolutionRate);

      // 2. Pending NGOs Verification Queue
      const ngoRes = await this.fetchApi('/api/admin/ngos');
      const ngos = await ngoRes.json();
      const ngoQueueEl = document.getElementById('adminNgoQueue');
      if (ngoQueueEl) {
        ngoQueueEl.innerHTML = ngos.map(n => `
          <div style="background:white; border:1px solid #e2e8f0; border-radius:8px; padding:12px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
            <div>
              <strong>${this.escapeHtml(n.org_name)}</strong> (Reg: ${n.reg_number})
              <div style="font-size:0.75rem; color:#64748b;">Contact: ${n.contact_person} • Status: <span style="font-weight:700; color:${n.verification_status === 'verified' ? '#16a34a' : '#f59e0b'}">${n.verification_status}</span></div>
            </div>
            <div style="display:flex; gap:6px;">
              ${n.verification_status !== 'verified' ? `
                <button class="btn btn-success btn-sm" onclick="App.verifyNgo(${n.id}, 'verified')">✔ Approve</button>
                <button class="btn btn-danger btn-sm" onclick="App.verifyNgo(${n.id}, 'rejected')">Reject</button>
              ` : '<span style="font-size:0.75rem; color:#10b981; font-weight:700;">Verified</span>'}
            </div>
          </div>
        `).join('');
      }

      // 3. Disputes & Safety Reports Queue
      const disputeRes = await this.fetchApi('/api/admin/disputes');
      const disputes = await disputeRes.json();
      const disputeListEl = document.getElementById('adminDisputesQueue');
      if (disputeListEl) {
        if (!disputes || disputes.length === 0) {
          disputeListEl.innerHTML = '<p style="color:#64748b; font-size:0.85rem;">No active reports or disputes.</p>';
        } else {
          disputeListEl.innerHTML = disputes.map(d => `
            <div style="background:white; border:1px solid #e2e8f0; border-radius:8px; padding:12px; margin-bottom:8px;">
              <div style="display:flex; justify-content:space-between; font-size:0.8rem;">
                <strong>⚠️ ${d.category}</strong>
                <span style="color:#ef4444; font-weight:700;">${d.status}</span>
              </div>
              <p style="font-size:0.85rem; color:#334155; margin:6px 0;">"${this.escapeHtml(d.details)}"</p>
              <div style="font-size:0.72rem; color:#64748b; display:flex; justify-content:space-between; align-items:center;">
                <span>Reporter: ${d.reporter_name}</span>
                ${d.status === 'Pending' ? `
                  <button class="btn btn-secondary btn-sm" onclick="App.resolveDispute(${d.id})">Resolve</button>
                ` : '<span style="color:#10b981;">Resolved</span>'}
              </div>
            </div>
          `).join('');
        }
      }
    } catch (e) {
      console.error(e);
    }
  },

  async verifyNgo(id, status) {
    try {
      await this.fetchApi(`/api/admin/ngos/${id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      this.showToast(`NGO verification status updated to ${status}!`, 'success');
      this.loadAdminPanel();
    } catch (e) {
      console.error(e);
    }
  },

  async resolveDispute(id) {
    try {
      await this.fetchApi(`/api/admin/disputes/${id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Resolved', admin_resolution: 'Reviewed by administrator' })
      });
      this.showToast('Dispute marked as resolved.', 'success');
      this.loadAdminPanel();
    } catch (e) {
      console.error(e);
    }
  },

  async loadAdminMetricsSummary() {
    try {
      const res = await this.fetchApi('/api/admin/metrics');
      const data = await res.json();
      const heroUsers = document.getElementById('heroStatUsers');
      const heroRequests = document.getElementById('heroStatRequests');
      const heroResolved = document.getElementById('heroStatResolved');
      if (heroUsers) heroUsers.textContent = data.totalUsers || '0';
      if (heroRequests) heroRequests.textContent = data.totalRequests || '0';
      if (heroResolved) heroResolved.textContent = `${data.resolutionRate || 95}%`;
    } catch (e) {
      console.error(e);
    }
  },

  // Utilities
  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span>${type === 'success' ? '✔' : type === 'error' ? '✖' : 'ℹ'}</span> <span>${this.escapeHtml(message)}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  },

  escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
};

// Global Close Modal helper
function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('active');
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
