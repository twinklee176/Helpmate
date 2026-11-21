/**
 * HelpMate - Core Application Frontend Script
 * Exact implementation of GUI UI 01, UI 02, and UI 03
 * Software Engineering Lab Project Implementation (Sprint 1 to Sprint 6)
 */

const App = {
  currentUser: null,
  pageMode: 'landing', // 'landing' (UI 01 & UI 02) or 'workspace' (UI 03)
  activeAppView: 'dash-home',
  selectedSector: 'All',
  selectedRating: 5,
  activeChatRequestId: null,
  activeChatReceiverId: null,

  async init() {
    this.bindGlobalEvents();
    // Initialize default persona (Alex Johnson / Rahul Sharma)
    await this.switchDemoUser('rahul');
    this.loadRecommendedOpportunities();
    this.loadRequests();
    this.loadNotifications();
  },

  bindGlobalEvents() {
    // Keyboard shortcut for search (⌘K or Ctrl+K)
    window.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        this.showWorkspace();
        const searchInput = document.getElementById('workspaceSearchInput');
        if (searchInput) searchInput.focus();
      }
    });

    // Star rating picker in review modal
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

  // ==================================================================
  // PAGE MODE TOGGLING (UI 01/02 Landing <--> UI 03 Workspace)
  // ==================================================================
  showLandingPage() {
    this.pageMode = 'landing';
    document.getElementById('landingPageMode').style.display = 'block';
    document.getElementById('workspaceMode').style.display = 'none';
    const btn = document.getElementById('pageModeBtn');
    if (btn) btn.textContent = 'Switch to: 📊 App Workspace (UI 03)';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  showWorkspace() {
    this.pageMode = 'workspace';
    document.getElementById('landingPageMode').style.display = 'none';
    document.getElementById('workspaceMode').style.display = 'flex';
    const btn = document.getElementById('pageModeBtn');
    if (btn) btn.textContent = 'Switch to: 🌐 Landing Page (UI 01 & UI 02)';
    this.switchAppView(this.activeAppView || 'dash-home');
  },

  togglePageMode() {
    if (this.pageMode === 'landing') {
      this.showWorkspace();
    } else {
      this.showLandingPage();
    }
  },

  showWorkspaceSector(sector) {
    this.selectedSector = sector;
    this.showWorkspace();
    this.switchAppView('dash-discover');
    const filterSelect = document.getElementById('discoverSectorFilter');
    if (filterSelect) filterSelect.value = sector;
    this.loadRequests();
  },

  scrollToSection(id) {
    this.showLandingPage();
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  },

  executeHeroSearch() {
    const input = document.getElementById('heroSearchInput');
    const query = (input?.value || '').trim();
    this.showWorkspace();
    this.switchAppView('dash-discover');
    const discoverSearch = document.getElementById('discoverSearchInput');
    if (discoverSearch) {
      discoverSearch.value = query;
      this.loadRequests();
    }
  },

  // ==================================================================
  // UI 03 WORKSPACE VIEW SWITCHING
  // ==================================================================
  switchAppView(viewId) {
    this.activeAppView = viewId;

    // Update Sidebar Navigation state
    document.querySelectorAll('.sidebar-nav-item').forEach(item => {
      if (item.getAttribute('data-appview') === viewId) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Update View Sections
    const viewMap = {
      'dash-home': 'dashHomeView',
      'dash-discover': 'dashDiscoverView',
      'dash-my-requests': 'dashMyRequestsView',
      'dash-contributions': 'dashContributionsView',
      'dash-circles': 'dashCirclesView',
      'dash-profile': 'dashProfileView',
      'dash-admin': 'dashAdminView'
    };

    document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active-view'));
    const targetId = viewMap[viewId] || 'dashHomeView';
    const targetSection = document.getElementById(targetId);
    if (targetSection) targetSection.classList.add('active-view');

    // Update Breadcrumb
    const breadcrumb = document.getElementById('dashBreadcrumbCurrent');
    if (breadcrumb) {
      const titles = {
        'dash-home': 'Dashboard',
        'dash-discover': 'Discover Help',
        'dash-my-requests': 'My Requests',
        'dash-contributions': 'My Contributions',
        'dash-circles': 'Help Circles',
        'dash-profile': 'My Profile',
        'dash-admin': 'Admin Panel'
      };
      breadcrumb.textContent = titles[viewId] || 'Dashboard';
    }

    // Load data for specific view
    if (viewId === 'dash-home') {
      this.loadRecommendedOpportunities();
      this.loadDashboardStats();
    } else if (viewId === 'dash-discover') {
      this.loadRequests();
    } else if (viewId === 'dash-my-requests') {
      this.loadMyRequests();
    } else if (viewId === 'dash-contributions') {
      this.loadMyContributions();
    } else if (viewId === 'dash-circles') {
      this.loadCircles();
    } else if (viewId === 'dash-profile') {
      this.loadProfile();
    } else if (viewId === 'dash-admin') {
      this.loadAdminPanel();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  // 1-Click Persona Switcher
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

        document.querySelectorAll('.demo-role-btn').forEach(b => {
          if (b.getAttribute('data-demo') === demoKey) b.classList.add('active');
          else b.classList.remove('active');
        });

        if (this.pageMode === 'workspace') {
          this.switchAppView(this.activeAppView || 'dash-home');
        }
      }
    } catch (e) {
      console.error(e);
    }
  },

  updateUserUI() {
    if (!this.currentUser) return;
    const name = this.currentUser.name;
    const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2);

    const avatarEl = document.getElementById('dashHeaderAvatar');
    const nameEl = document.getElementById('dashHeaderName');
    const roleEl = document.getElementById('dashHeaderRole');
    const welcomeEl = document.getElementById('dashWelcomeTitle');
    const adminItem = document.getElementById('sidebarAdminItem');

    if (avatarEl) avatarEl.textContent = initials;
    if (nameEl) nameEl.textContent = name;
    if (roleEl) roleEl.textContent = this.currentUser.role === 'admin' ? 'Administrator' : 'Community member ⌄';
    if (welcomeEl) welcomeEl.textContent = `Welcome back, ${name.split(' ')[0]}!`;

    if (adminItem) {
      adminItem.style.display = this.currentUser.role === 'admin' ? 'block' : 'none';
    }
  },

  async fetchApi(url, options = {}) {
    options.headers = {
      ...(options.headers || {}),
      'x-user-id': this.currentUser ? this.currentUser.id : 1
    };
    return fetch(url, options);
  },

  // ==================================================================
  // UI 03: RECOMMENDED FOR YOU (Exact Match to Screenshot)
  // ==================================================================
  async loadRecommendedOpportunities() {
    const grid = document.getElementById('recommendedCardsGrid');
    if (!grid) return;

    try {
      const res = await this.fetchApi('/api/matching/recommendations');
      const data = await res.json();

      // UI 03 Seed Cards (Koramangala, Lakeside Park, Indiranagar)
      const ui03DefaultCards = [
        {
          id: 1,
          icon: '</>',
          matchScore: 92,
          sector: 'EDUCATION & SKILL DEVELOPMENT',
          title: 'Programming Mentor Needed',
          desc: 'Help a curious student take their first steps in Python and build something meaningful.',
          location: 'Koramangala • 2.4 km away',
          tags: ['Python', 'Mentoring'],
          timing: '📅 Nov 21–22 • ⏰ 2 hrs • Flexible',
          orgAvatar: 'BF',
          orgName: 'Bright Futures Foundation',
          whyMatch: [
            'Skill Alignment (+35%): Expert Python programming match',
            'Availability Alignment (+25%): Weekend open time slots match',
            'Proximity (+18%): Located within 2.4 km in Koramangala',
            'Reliability (+14%): High 95% trust score'
          ]
        },
        {
          id: 2,
          icon: '🌱',
          matchScore: 86,
          sector: 'COMMUNITY ASSISTANCE',
          title: 'Community Clean-up Drive',
          desc: 'Join your neighbours for a cleaner, greener weekend at the beautiful Lakeside Park.',
          location: 'HSR Layout • 3.1 km away',
          tags: ['Teamwork', 'Community'],
          timing: '📅 Sun, Nov 22 • ⏰ 7:00–10:00 AM',
          orgAvatar: 'GB',
          orgName: 'Green Bengaluru',
          whyMatch: [
            'General Community Support (+25%): Open to active local volunteers',
            'Availability Alignment (+25%): Matched Sunday Morning slot',
            'Proximity (+18%): 3.1 km away in HSR Layout',
            'Trust & Reliability (+18%): Verified active profile'
          ]
        },
        {
          id: 3,
          icon: '📖',
          matchScore: 89,
          sector: 'NGO & VOLUNTEERING',
          title: 'Weekend Teaching Volunteer',
          desc: 'Make learning a little brighter. Teach basic English and maths to children aged 8–12.',
          location: 'Indiranagar • 4.8 km away',
          tags: ['Teaching', 'Communication'],
          timing: '📅 Sat, Nov 21 • ⏰ 10:00 AM–1:00 PM',
          orgAvatar: 'UL',
          orgName: 'Udaan Learning Centre',
          whyMatch: [
            'Skill Alignment (+32%): Teaching and academic communication',
            'Availability Alignment (+25%): Saturday Morning matched',
            'Proximity (+16%): Indiranagar 4.8 km locality',
            'Reliability (+16%): Strong verified community presence'
          ]
        }
      ];

      const cardsToRender = (data && data.length >= 3) ? data.slice(0, 3).map((item, idx) => ({
        id: item.id,
        icon: idx === 0 ? '</>' : idx === 1 ? '🌱' : '📖',
        matchScore: item.matchScore || ui03DefaultCards[idx].matchScore,
        sector: item.sector.toUpperCase(),
        title: item.title,
        desc: item.description,
        location: `${item.area} • ${item.city}`,
        tags: (item.required_skills || 'Mentoring').split(',').map(s => s.trim()),
        timing: `📅 ${item.date_time || 'Flexible'} • ⏰ ${item.duration || '2 hrs'}`,
        orgAvatar: item.requester_name ? item.requester_name.slice(0, 2).toUpperCase() : 'BF',
        orgName: item.requester_name || 'Community Initiative',
        whyMatch: item.matchReasons || ui03DefaultCards[idx].whyMatch
      })) : ui03DefaultCards;

      grid.innerHTML = cardsToRender.map(card => {
        const jsonReasons = encodeURIComponent(JSON.stringify(card.whyMatch));
        return `
          <div class="opportunity-card">
            <div>
              <div class="opportunity-card-top">
                <div class="opp-type-icon">${card.icon}</div>
                <div class="opp-match-badge" onclick="event.stopPropagation(); window.MatchingEngine.showExplainModal(${card.matchScore}, decodeURIComponent('${jsonReasons}'))">
                  <span>⚡ ${card.matchScore}% Match</span>
                  <span style="font-size:0.65rem; opacity:0.75;">DEMO</span>
                </div>
              </div>

              <div class="opp-sector-label">${card.sector}</div>
              <h4 class="opp-title">${this.escapeHtml(card.title)}</h4>
              <p class="opp-desc">${this.escapeHtml(card.desc)}</p>

              <div class="opp-meta-list">
                <div class="opp-meta-item">
                  <span>📍</span>
                  <span>${this.escapeHtml(card.location)}</span>
                </div>
                <div class="opp-meta-item">
                  <span>${card.timing}</span>
                </div>
              </div>

              <div class="opp-tags-row">
                ${card.tags.map(t => `<span class="opp-chip-tag">${this.escapeHtml(t)}</span>`).join('')}
              </div>

              <div class="opp-org-info">
                <div class="opp-org-avatar">${card.orgAvatar}</div>
                <div class="opp-org-name">${this.escapeHtml(card.orgName)}</div>
              </div>

              <button class="opp-accordion-btn" onclick="event.stopPropagation(); window.MatchingEngine.showExplainModal(${card.matchScore}, decodeURIComponent('${jsonReasons}'))">
                <span>Why this match?</span>
                <span>&or;</span>
              </button>
            </div>

            <div class="opp-action-row">
              <button class="btn-opp-view" onclick="App.openRequestDetailsModal(${card.id})">
                <span>View Request</span>
                <span>&rarr;</span>
              </button>
              <button class="btn-opp-bookmark" title="Bookmark Opportunity" onclick="App.showToast('Opportunity saved to your bookmarks!', 'info')">
                🔖
              </button>
            </div>
          </div>
        `;
      }).join('');
    } catch (e) {
      console.error(e);
    }
  },

  async loadDashboardStats() {
    try {
      const res = await this.fetchApi('/api/admin/metrics');
      const metrics = await res.json();
      const activeEl = document.getElementById('dashKpiActive');
      const givenEl = document.getElementById('dashKpiGiven');
      const completedEl = document.getElementById('dashKpiCompleted');
      const contribEl = document.getElementById('dashKpiContrib');

      if (activeEl) activeEl.textContent = String(metrics.activeRequests || 4).padStart(2, '0');
      if (givenEl) givenEl.textContent = '12';
      if (completedEl) completedEl.textContent = String(metrics.completedRequests || 8).padStart(2, '0');
      if (contribEl) contribEl.textContent = '15';
    } catch (e) {
      console.error(e);
    }
  },

  filterDashboardBySector(sector) {
    this.selectedSector = sector;
    this.switchAppView('dash-discover');
    const select = document.getElementById('discoverSectorFilter');
    if (select) select.value = sector;
    this.loadRequests();
  },

  filterDashboardCategory(category) {
    this.selectedSector = category;
    this.loadRecommendedOpportunities();
  },

  onWorkspaceSearch(val) {
    if (this.activeAppView !== 'dash-discover') {
      this.switchAppView('dash-discover');
    }
    const searchInput = document.getElementById('discoverSearchInput');
    if (searchInput) {
      searchInput.value = val;
      this.loadRequests();
    }
  },

  // ==================================================================
  // DISCOVER HELP REQUESTS (MODULE 2 & 3)
  // ==================================================================
  async loadRequests() {
    const listEl = document.getElementById('requestsGrid');
    if (!listEl) return;

    const search = document.getElementById('discoverSearchInput')?.value || '';
    const sector = document.getElementById('discoverSectorFilter')?.value || this.selectedSector || 'All';
    const urgency = document.getElementById('discoverUrgencyFilter')?.value || 'All';

    const params = new URLSearchParams({ sector, search, urgency });
    try {
      const res = await this.fetchApi(`/api/requests?${params.toString()}`);
      const requests = await res.json();

      if (!requests || requests.length === 0) {
        listEl.innerHTML = `
          <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted); background: var(--card-bg); border-radius: var(--radius-lg); border: 1px dashed var(--border-light);">
            <p style="font-size: 1.1rem; color: #ffffff; margin-bottom: 6px;">No requests found</p>
            <p style="font-size: 0.85rem;">Try modifying your search query or selecting a different assistance sector.</p>
          </div>
        `;
        return;
      }

      listEl.innerHTML = requests.map(req => {
        const skillsArr = (req.required_skills || '').split(',').map(s => s.trim()).filter(Boolean);
        return `
          <div class="opportunity-card" onclick="App.openRequestDetailsModal(${req.id})">
            <div>
              <div class="opportunity-card-top">
                <div class="opp-type-icon">🤝</div>
                <span style="font-size:0.72rem; padding: 3px 8px; border-radius: 999px; background: rgba(229,169,60,0.15); color: var(--gold); font-weight:700;">
                  ${req.urgency}
                </span>
              </div>

              <div class="opp-sector-label">${this.escapeHtml(req.sector)}</div>
              <h4 class="opp-title">${this.escapeHtml(req.title)}</h4>
              <p class="opp-desc">${this.escapeHtml(req.description)}</p>

              <div class="opp-meta-list">
                <div class="opp-meta-item">
                  <span>📍</span>
                  <span>${req.is_remote ? 'Remote / Online' : `${req.area}, ${req.city}`}</span>
                </div>
                <div class="opp-meta-item">
                  <span>⏰</span>
                  <span>${req.date_time || 'Flexible'} (${req.duration || '2 hrs'})</span>
                </div>
              </div>

              ${skillsArr.length > 0 ? `
                <div class="opp-tags-row">
                  ${skillsArr.map(s => `<span class="opp-chip-tag">${this.escapeHtml(s)}</span>`).join('')}
                </div>
              ` : ''}

              <div class="opp-org-info">
                <div class="opp-org-avatar">${req.requester_name.slice(0, 2).toUpperCase()}</div>
                <div class="opp-org-name">${this.escapeHtml(req.requester_name)} (⭐ ${req.requester_rating})</div>
              </div>
            </div>

            <div class="opp-action-row">
              <button class="btn-opp-view" onclick="event.stopPropagation(); App.openRequestDetailsModal(${req.id})">
                <span>View &amp; Offer</span>
                <span>&rarr;</span>
              </button>
            </div>
          </div>
        `;
      }).join('');
    } catch (e) {
      console.error(e);
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
            <h4 style="font-size: 1.05rem; color: #ffffff; margin-bottom: 12px; font-weight: 700;">
              Received Help Offers (${offers.length})
            </h4>
            <div style="display: flex; flex-direction: column; gap: 10px;">
              ${offers.map(o => `
                <div style="background: #091a13; border: 1px solid var(--border-subtle); border-radius: 10px; padding: 14px;">
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
                    <div>
                      <strong style="color: #ffffff; font-size: 0.9rem;">${this.escapeHtml(o.helper_name)}</strong>
                      <span style="font-size: 0.75rem; color: var(--text-muted); margin-left: 6px;">⭐ ${o.helper_rating} (${o.helper_reliability}% Reliability)</span>
                    </div>
                    <span style="font-size: 0.75rem; font-weight: 700; color: #34d399;">⚡ ${o.match_score}% Match</span>
                  </div>
                  <p style="font-size: 0.85rem; color: #d1ded8; margin-bottom: 10px;">"${this.escapeHtml(o.message)}"</p>
                  <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px dashed var(--border-subtle); padding-top: 8px;">
                    <span style="font-size: 0.75rem; color: ${o.status === 'Accepted' ? '#34d399' : 'var(--text-muted)'}; font-weight: 600;">Status: ${o.status}</span>
                    <div style="display: flex; gap: 6px;">
                      ${isOwner && o.status === 'Pending' ? `
                        <button class="btn-gold-primary" style="padding: 4px 10px; font-size: 0.75rem;" onclick="App.acceptOffer(${o.id})">✔ Accept</button>
                      ` : ''}
                      <button class="btn-outline-secondary" style="padding: 4px 10px; font-size: 0.75rem;" onclick="App.openChatModal(${req.id}, ${isOwner ? o.helper_id : req.user_id}, '${this.escapeHtml(isOwner ? o.helper_name : req.requester_name)}')">💬 Chat</button>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      } else {
        offersHtml = `
          <div style="margin-top: 18px; padding: 16px; background: #091a13; border-radius: 8px; text-align: center; color: var(--text-muted); font-size: 0.85rem;">
            No volunteers have applied yet. Be the first to offer assistance!
          </div>
        `;
      }

      const modalBody = document.getElementById('requestDetailsModalBody');
      modalBody.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <span style="font-size: 0.75rem; font-weight: 700; color: var(--gold); text-transform: uppercase;">${req.sector}</span>
          <span style="font-size: 0.72rem; padding: 2px 8px; border-radius: 999px; background: rgba(229,169,60,0.15); color: var(--gold);">${req.urgency}</span>
        </div>
        <h2 style="font-size: 1.3rem; color: #ffffff; margin-bottom: 8px;">${this.escapeHtml(req.title)}</h2>
        <p style="color: var(--text-muted); font-size: 0.92rem; line-height: 1.6; margin-bottom: 16px;">${this.escapeHtml(req.description)}</p>

        <div style="background: #071710; border: 1px solid var(--border-subtle); padding: 14px; border-radius: 8px; font-size: 0.85rem; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 16px;">
          <div>📍 <strong>Location:</strong> ${req.is_remote ? 'Remote / Online' : `${req.area}, ${req.city}`}</div>
          <div>⏰ <strong>Schedule:</strong> ${req.date_time || 'Flexible'} (${req.duration})</div>
          <div>👤 <strong>Requester:</strong> ${this.escapeHtml(req.requester_name)} (⭐ ${req.requester_rating})</div>
          <div>🔄 <strong>Status:</strong> <span style="font-weight: 700; color: #34d399;">${req.status}</span></div>
          ${req.required_skills ? `<div style="grid-column: 1/-1;">🏷️ <strong>Required Skills:</strong> ${this.escapeHtml(req.required_skills)}</div>` : ''}
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
          ${!isOwner && req.status === 'Open' ? `
            <button class="btn-gold-primary" onclick="App.openOfferHelpModal(${req.id}, '${this.escapeHtml(req.title)}')">🤝 Offer Assistance</button>
          ` : ''}
          ${isOwner && (req.status === 'Accepted' || req.status === 'In Progress') ? `
            <button class="btn-gold-primary" onclick="App.completeRequest(${req.id})">⭐ Mark Completed</button>
          ` : ''}
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
        this.showToast('Help Request published to community!', 'success');
        document.getElementById('createRequestModal').classList.remove('active');
        form.reset();
        this.loadRequests();
        this.loadRecommendedOpportunities();
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
        this.showToast(`Offer submitted! Calculated Match: ${data.matchScore}%`, 'success');
        document.getElementById('offerHelpModal').classList.remove('active');
        document.getElementById('requestDetailsModal').classList.remove('active');
        this.loadRequests();
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
        this.showToast('Assistance marked as completed! Thank you.', 'success');
        document.getElementById('requestDetailsModal').classList.remove('active');
        this.loadRequests();
      }
    } catch (e) {
      console.error(e);
    }
  },

  // ==================================================================
  // IN-APP CHAT & NOTIFICATIONS
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
            <div style="font-size:0.7rem; opacity:0.8; margin-bottom:2px;">${isOutgoing ? 'You' : this.escapeHtml(m.sender_name)}</div>
            <div>${this.escapeHtml(m.message)}</div>
            <div style="font-size:0.65rem; text-align:right; opacity:0.7; margin-top:4px;">
              ${new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
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
      const dot = document.getElementById('unreadNotifBadgeDot');
      const sideBadge = document.getElementById('dashSidebarNotifBadge');

      if (dot) dot.style.display = data.unreadCount > 0 ? 'block' : 'none';
      if (sideBadge) sideBadge.textContent = data.unreadCount || '0';

      const listEl = document.getElementById('notifDropdownList');
      if (listEl && data.notifications) {
        listEl.innerHTML = data.notifications.map(n => `
          <div style="padding:10px 14px; border-bottom:1px solid var(--border-subtle); font-size:0.82rem; background:${n.is_read ? 'transparent' : 'rgba(52,211,153,0.08)'};">
            <div style="font-weight:700; color:#ffffff; margin-bottom:2px;">${this.escapeHtml(n.title)}</div>
            <div style="color:var(--text-muted); font-size:0.8rem;">${this.escapeHtml(n.message)}</div>
            <div style="font-size:0.68rem; color:var(--text-dim); margin-top:4px;">${new Date(n.created_at).toLocaleTimeString()}</div>
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
      const dot = document.getElementById('unreadNotifBadgeDot');
      if (dot) dot.style.display = 'none';
    }
  },

  // ==================================================================
  // MY REQUESTS & MY CONTRIBUTIONS & CIRCLES
  // ==================================================================
  async loadMyRequests() {
    const listEl = document.getElementById('myPostedRequestsList');
    if (!listEl) return;
    try {
      const res = await this.fetchApi('/api/requests?my_requests=true');
      const reqs = await res.json();
      if (!reqs || reqs.length === 0) {
        listEl.innerHTML = '<p style="color:var(--text-muted); padding:20px;">You haven\'t posted any requests yet.</p>';
        return;
      }
      listEl.innerHTML = reqs.map(r => `
        <div style="background:var(--card-bg); border:1px solid var(--border-subtle); border-radius:var(--radius-md); padding:16px; display:flex; justify-content:space-between; align-items:center;">
          <div>
            <h4 style="color:#ffffff; font-size:1rem; margin-bottom:4px;">${this.escapeHtml(r.title)}</h4>
            <div style="font-size:0.8rem; color:var(--text-muted);">${r.sector} &bull; Offers: ${r.offers_count} &bull; ${r.date_time}</div>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:0.75rem; color:#34d399; font-weight:700;">${r.status}</span>
            <button class="btn-outline-secondary" style="padding:6px 12px; font-size:0.8rem;" onclick="App.openRequestDetailsModal(${r.id})">View Offers</button>
          </div>
        </div>
      `).join('');
    } catch (e) {
      console.error(e);
    }
  },

  async loadMyContributions() {
    const listEl = document.getElementById('myContributionsList');
    if (!listEl) return;
    listEl.innerHTML = `
      <div style="background:var(--card-bg); border:1px solid var(--border-subtle); border-radius:var(--radius-md); padding:18px;">
        <h4 style="color:#ffffff; font-size:1rem; margin-bottom:4px;">Programming Mentorship Session</h4>
        <div style="font-size:0.8rem; color:var(--text-muted); margin-bottom:8px;">Assisted Alex Johnson with Python Data Structures &bull; Completed</div>
        <span style="font-size:0.75rem; color:#c084fc; font-weight:700;">⭐ 5.0 Star Feedback Received</span>
      </div>
    `;
  },

  async loadCircles() {
    const listEl = document.getElementById('circlesGrid');
    if (!listEl) return;
    try {
      const res = await this.fetchApi('/api/circles');
      const circles = await res.json();
      listEl.innerHTML = circles.map(c => `
        <div class="opportunity-card">
          <div>
            <div class="opp-type-icon">⭕</div>
            <h4 class="opp-title" style="margin-top:10px;">${this.escapeHtml(c.title)}</h4>
            <p class="opp-desc">${this.escapeHtml(c.description)}</p>
            <div style="font-size:0.8rem; color:var(--text-muted); margin-top:8px;">
              Circle Lead: <strong>${this.escapeHtml(c.lead_name)}</strong> &bull; ${c.members_count} Members
            </div>
          </div>
          <div class="opp-action-row" style="margin-top:14px;">
            <button class="btn-gold-primary" style="width:100%;" onclick="App.joinCircle(${c.id})">Join Help Circle</button>
          </div>
        </div>
      `).join('');
    } catch (e) {
      console.error(e);
    }
  },

  async joinCircle(id) {
    try {
      await this.fetchApi(`/api/circles/${id}/join`, { method: 'POST' });
      this.showToast('Joined Help Circle!', 'success');
      this.loadCircles();
    } catch (e) {
      console.error(e);
    }
  },

  async loadProfile() {
    if (!this.currentUser) return;
    try {
      const res = await this.fetchApi(`/api/users/profile/${this.currentUser.id}`);
      const data = await res.json();

      document.getElementById('profName').textContent = data.user.name;
      document.getElementById('profBio').textContent = data.user.bio || 'Active community member.';
      document.getElementById('profLocation').textContent = `${data.user.area}, ${data.user.city} (Radius: ${data.user.radius_km} km)`;
      document.getElementById('profTrustScore').textContent = `${data.user.reliability_score}%`;
      document.getElementById('profRatingAvg').textContent = `${data.user.rating_avg} ★`;

      const skillsEl = document.getElementById('profSkillsList');
      if (skillsEl) {
        skillsEl.innerHTML = (data.skills || []).map(s => `
          <span class="opp-chip-tag" style="font-size:0.8rem; padding:4px 10px;">
            ${s.skill_name} (${s.proficiency})
          </span>
        `).join('');
      }

      const availEl = document.getElementById('profAvailabilityList');
      if (availEl) {
        availEl.innerHTML = (data.availability || []).map(a => `
          <div style="background:#091a13; border:1px solid var(--border-subtle); padding:8px 12px; border-radius:6px; font-size:0.85rem; margin-bottom:6px;">
            🗓️ <strong>${a.day_of_week}:</strong> ${a.time_slot} (${a.preferred_duration})
          </div>
        `).join('');
      }
    } catch (e) {
      console.error(e);
    }
  },

  async loadAdminPanel() {
    try {
      const metricsRes = await this.fetchApi('/api/admin/metrics');
      const metrics = await metricsRes.json();

      window.CommunityCharts.renderSectorDoughnut('adminSectorChart', metrics.sectorStats);
      window.CommunityCharts.renderSuccessGauge('adminSuccessGauge', metrics.resolutionRate);

      const ngoRes = await this.fetchApi('/api/admin/ngos');
      const ngos = await ngoRes.json();
      const queueEl = document.getElementById('adminNgoQueue');
      if (queueEl) {
        queueEl.innerHTML = ngos.map(n => `
          <div style="background:#091a13; border:1px solid var(--border-subtle); border-radius:8px; padding:12px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
            <div>
              <strong style="color:#ffffff;">${this.escapeHtml(n.org_name)}</strong>
              <div style="font-size:0.75rem; color:var(--text-muted);">Status: ${n.verification_status}</div>
            </div>
            ${n.verification_status !== 'verified' ? `
              <button class="btn-gold-primary" style="padding:4px 8px; font-size:0.75rem;" onclick="App.verifyNgo(${n.id}, 'verified')">Approve</button>
            ` : '<span style="color:#34d399; font-size:0.75rem;">Verified</span>'}
          </div>
        `).join('');
      }

      const dispRes = await this.fetchApi('/api/admin/disputes');
      const disputes = await dispRes.json();
      const dispEl = document.getElementById('adminDisputesQueue');
      if (dispEl) {
        dispEl.innerHTML = disputes.length === 0 ? '<p style="color:var(--text-muted); font-size:0.85rem;">No open reports.</p>' : disputes.map(d => `
          <div style="background:#091a13; border:1px solid var(--border-subtle); border-radius:8px; padding:12px; margin-bottom:8px;">
            <strong style="color:var(--gold);">${d.category}</strong>
            <p style="font-size:0.82rem; color:#d1ded8; margin:4px 0;">"${this.escapeHtml(d.details)}"</p>
          </div>
        `).join('');
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
      this.showToast(`NGO verification updated to ${status}!`, 'success');
      this.loadAdminPanel();
    } catch (e) {
      console.error(e);
    }
  },

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
  }
};

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('active');
}

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
