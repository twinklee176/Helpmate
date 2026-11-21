/**
 * HelpMate - Community Impact Analytics & Visualizations
 * Native SVG/Canvas Charts for Module 6 (Admin & Community Analytics)
 */

window.CommunityCharts = {
  renderSectorDoughnut(containerId, sectorData) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!sectorData || sectorData.length === 0) {
      container.innerHTML = '<p style="text-align:center; color:#94a3b8; padding:20px;">No sector data recorded yet.</p>';
      return;
    }

    const total = sectorData.reduce((acc, curr) => acc + curr.count, 0) || 1;
    const colors = ['#2563eb', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444'];
    
    let cumulativeAngle = 0;
    let paths = '';
    let legends = '';

    sectorData.forEach((item, index) => {
      const fraction = item.count / total;
      const angle = fraction * 360;
      const color = colors[index % colors.length];

      // Calculate SVG Arc coordinates
      const startAngle = cumulativeAngle;
      const endAngle = cumulativeAngle + angle;
      cumulativeAngle = endAngle;

      const x1 = 100 + 70 * Math.cos((Math.PI * (startAngle - 90)) / 180);
      const y1 = 100 + 70 * Math.sin((Math.PI * (startAngle - 90)) / 180);
      const x2 = 100 + 70 * Math.cos((Math.PI * (endAngle - 90)) / 180);
      const y2 = 100 + 70 * Math.sin((Math.PI * (endAngle - 90)) / 180);

      const largeArc = angle > 180 ? 1 : 0;

      paths += `
        <path d="M 100 100 L ${x1} ${y1} A 70 70 0 ${largeArc} 1 ${x2} ${y2} Z" 
              fill="${color}" stroke="#ffffff" stroke-width="2">
          <title>${item.sector}: ${item.count} requests (${Math.round(fraction * 100)}%)</title>
        </path>
      `;

      legends += `
        <div style="display:flex; align-items:center; gap:8px; font-size:0.8rem; margin-bottom:4px;">
          <span style="width:12px; height:12px; border-radius:3px; background:${color}; display:inline-block;"></span>
          <span style="color:#334155; font-weight:500;">${item.sector}</span>
          <strong style="margin-left:auto; color:#0f172a;">${item.count} (${Math.round(fraction * 100)}%)</strong>
        </div>
      `;
    });

    container.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:space-around; flex-wrap:wrap; gap:16px;">
        <svg width="200" height="200" viewBox="0 0 200 200">
          ${paths}
          <!-- Donut Hole -->
          <circle cx="100" cy="100" r="42" fill="#ffffff" />
          <text x="100" y="96" text-anchor="middle" font-size="16" font-weight="bold" fill="#0f172a">${total}</text>
          <text x="100" y="112" text-anchor="middle" font-size="10" fill="#64748b">Requests</text>
        </svg>
        <div style="flex:1; min-width:200px;">
          ${legends}
        </div>
      </div>
    `;
  },

  renderSuccessGauge(containerId, percentage) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const rate = Math.min(100, Math.max(0, percentage || 0));
    const strokeDash = (rate / 100) * 283;

    container.innerHTML = `
      <div style="text-align:center; padding:10px;">
        <svg width="150" height="150" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="none" stroke="#e2e8f0" stroke-width="8" />
          <circle cx="50" cy="50" r="45" fill="none" stroke="#10b981" stroke-width="8"
                  stroke-dasharray="${strokeDash} 283" stroke-linecap="round"
                  transform="rotate(-90 50 50)" />
          <text x="50" y="48" text-anchor="middle" font-size="18" font-weight="bold" fill="#0f172a">${rate}%</text>
          <text x="50" y="62" text-anchor="middle" font-size="7" fill="#64748b">Resolution Rate</text>
        </svg>
        <p style="font-size:0.85rem; color:#475569; font-weight:600; margin-top:4px;">Community Assistance Fulfilled</p>
      </div>
    `;
  }
};
