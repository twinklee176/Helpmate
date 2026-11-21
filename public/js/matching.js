/**
 * HelpMate - Multi-Factor Matching & Explainable Recommendations Engine
 * Client-Side Visualization & Calculation
 * Implements Sprint 3: Stories 13, 14, 15, 16
 */

window.MatchingEngine = {
  /**
   * Renders a match score badge that triggers the explainability breakdown popup
   */
  renderBadge(score, reasons = []) {
    const safeReasons = typeof reasons === 'string' ? JSON.parse(reasons) : (reasons || []);
    const jsonStr = encodeURIComponent(JSON.stringify(safeReasons));
    
    let colorClass = 'match-high';
    let gradient = 'linear-gradient(135deg, #10b981, #059669)';
    if (score < 60) {
      gradient = 'linear-gradient(135deg, #f59e0b, #d97706)';
    }
    if (score < 40) {
      gradient = 'linear-gradient(135deg, #64748b, #475569)';
    }

    return `
      <div class="match-score-pill" style="background: ${gradient};" 
           onclick="event.stopPropagation(); MatchingEngine.showExplainModal(${score}, decodeURIComponent('${jsonStr}'))"
           title="Click to view explainable multi-factor matching breakdown">
        <span>⚡ ${score}% Match</span>
        <span style="font-size:0.65rem; opacity:0.9;">ⓘ</span>
      </div>
    `;
  },

  /**
   * Opens the Explainable AI Recommendation Breakdown modal
   */
  showExplainModal(score, reasonsJson) {
    let reasons = [];
    try {
      reasons = typeof reasonsJson === 'string' ? JSON.parse(reasonsJson) : reasonsJson;
    } catch (e) {
      reasons = [];
    }

    const modalBody = document.getElementById('explainModalBody');
    if (!modalBody) return;

    let reasonsHtml = '';
    if (reasons && reasons.length > 0) {
      reasonsHtml = reasons.map(r => `
        <li style="padding: 8px 12px; background: white; border-radius: 6px; border: 1px solid #e2e8f0; margin-bottom: 6px; font-size: 0.85rem;">
          ${r}
        </li>
      `).join('');
    } else {
      reasonsHtml = `
        <li style="padding: 8px; color: #64748b;">
          Multi-factor matching evaluated profile skills, active schedule slots, neighborhood distance, and community trust score.
        </li>
      `;
    }

    modalBody.innerHTML = `
      <div style="text-align: center; margin-bottom: 18px;">
        <div style="display: inline-flex; align-items: center; justify-content: center; width: 72px; height: 72px; border-radius: 50%; background: #ecfdf5; border: 4px solid #10b981; margin-bottom: 8px;">
          <span style="font-size: 1.5rem; font-weight: 800; color: #065f46;">${score}%</span>
        </div>
        <h4 style="font-size: 1.15rem; color: #0f172a;">Transparent Match Score Breakdown</h4>
        <p style="font-size: 0.82rem; color: #64748b;">How HelpMate's Multi-Factor Algorithm matched this request</p>
      </div>

      <div style="margin-bottom: 16px;">
        <h5 style="font-size: 0.88rem; font-weight: 700; color: #334155; margin-bottom: 8px;">Evaluation Factors:</h5>
        
        <!-- Factor 1: Skills -->
        <div style="margin-bottom: 10px;">
          <div style="display:flex; justify-content:space-between; font-size:0.8rem; font-weight:600; margin-bottom:3px;">
            <span>1. Skill & Expertise Compatibility (Max 35 pts)</span>
            <span style="color:#2563eb;">Weighted 35%</span>
          </div>
          <div style="width:100%; height:6px; background:#e2e8f0; border-radius:3px; overflow:hidden;">
            <div style="width: ${Math.min(100, (score * 1.05))}%; height:100%; background:#2563eb;"></div>
          </div>
        </div>

        <!-- Factor 2: Availability -->
        <div style="margin-bottom: 10px;">
          <div style="display:flex; justify-content:space-between; font-size:0.8rem; font-weight:600; margin-bottom:3px;">
            <span>2. Availability & Preferred Slots (Max 25 pts)</span>
            <span style="color:#0d9488;">Weighted 25%</span>
          </div>
          <div style="width:100%; height:6px; background:#e2e8f0; border-radius:3px; overflow:hidden;">
            <div style="width: 85%; height:100%; background:#0d9488;"></div>
          </div>
        </div>

        <!-- Factor 3: Proximity -->
        <div style="margin-bottom: 10px;">
          <div style="display:flex; justify-content:space-between; font-size:0.8rem; font-weight:600; margin-bottom:3px;">
            <span>3. Locality, Radius & Remote Option (Max 20 pts)</span>
            <span style="color:#f59e0b;">Weighted 20%</span>
          </div>
          <div style="width:100%; height:6px; background:#e2e8f0; border-radius:3px; overflow:hidden;">
            <div style="width: 90%; height:100%; background:#f59e0b;"></div>
          </div>
        </div>

        <!-- Factor 4: Reliability -->
        <div style="margin-bottom: 12px;">
          <div style="display:flex; justify-content:space-between; font-size:0.8rem; font-weight:600; margin-bottom:3px;">
            <span>4. Trust & Reliability History (Max 20 pts)</span>
            <span style="color:#8b5cf6;">Weighted 20%</span>
          </div>
          <div style="width:100%; height:6px; background:#e2e8f0; border-radius:3px; overflow:hidden;">
            <div style="width: 95%; height:100%; background:#8b5cf6;"></div>
          </div>
        </div>
      </div>

      <div style="background: #f8fafc; border-radius: 8px; padding: 12px; border: 1px solid #e2e8f0;">
        <h5 style="font-size: 0.85rem; font-weight: 700; color: #1e293b; margin-bottom: 8px;">Detailed Audit Log / Reasons:</h5>
        <ul style="list-style: none; padding: 0; margin: 0;">
          ${reasonsHtml}
        </ul>
      </div>
    `;

    document.getElementById('explainModal').classList.add('active');
  }
};
