export async function loadAnalyticsPage(root, Store, supabase) {
  const a = Store.analytics;
  root.innerHTML = `
<style>
.an-top{display:grid;grid-template-columns:repeat(4,1fr);gap:18px;margin-bottom:24px;}
.an-mid{display:grid;grid-template-columns:2fr 1fr;gap:20px;margin-bottom:24px;}
.an-bottom{display:grid;grid-template-columns:1fr 1fr;gap:20px;}
.dept-row{display:grid;grid-template-columns:80px 1fr 60px 60px 70px;gap:12px;align-items:center;padding:10px 0;border-bottom:1px solid var(--glass-border-subtle);font-size:.875rem;}
.dept-row:last-child{border-bottom:none;}
.dept-name{font-weight:600;color:var(--text-primary);}
.dept-bar-track{height:8px;background:rgba(0,0,0,0.25);border-radius:99px;overflow:hidden;}
.dept-bar-fill{height:100%;border-radius:99px;background:linear-gradient(90deg, var(--brand-primary), #8B5CF6);}
.dept-pct,.dept-pkg,.dept-high{color:var(--text-description);text-align:right;}

/* Stat Card Premium Styling */
.stat-card {
  background: var(--glass-2);
  backdrop-filter: var(--blur-md);
  -webkit-backdrop-filter: var(--blur-md);
  border: 1px solid var(--glass-border-main);
  border-radius: var(--radius-lg);
  padding: 24px;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  min-height: 148px;
  box-shadow: var(--glass-shadow-sm);
}
.stat-card::before {
  content: '';
  position: absolute;
  top: 0; left: 10%; right: 10%;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--glass-specular), transparent);
  pointer-events: none;
}
.stat-card:hover {
  transform: translateY(-4px);
  border-color: rgba(129, 140, 248, 0.35);
  box-shadow: var(--shadow-card-hover);
}
.stat-card-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  margin-bottom: 16px;
  align-self: flex-start;
  border: 1px solid rgba(255, 255, 255, 0.05);
}
.stat-card-value {
  font-size: 28px;
  font-weight: 800;
  color: #fff;
  line-height: 1.1;
  margin-bottom: 4px;
  letter-spacing: -0.03em;
  font-family: var(--font-display);
  text-shadow: 0 2px 12px rgba(129,140,248,0.15);
}
.stat-card-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-description);
  margin-bottom: 8px;
}
.stat-card-change {
  font-size: 10.5px;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-top: auto;
}
.stat-card-change.success {
  color: var(--success);
}
.stat-card-change.info {
  color: var(--info);
}
</style>
<div class="page-header" style="display:flex;justify-content:space-between;align-items:center;">
  <div><h1 class="page-title">Analytics & Reporting</h1><p class="page-subtitle">Real-time placement intelligence across your institution</p></div>
  <div style="display:flex;gap:10px;">
    <select class="input" style="width:auto;padding:8px 14px;font-size:.85rem;">
      <option>2024-25 Batch</option><option>2023-24 Batch</option><option>2022-23 Batch</option>
    </select>
    <button class="btn btn-secondary btn-sm">📥 Export Report</button>
  </div>
</div>

<!-- KPI row -->
<div class="an-top">
  <div class="stat-card animate-fade-in-up">
    <div class="stat-card-icon" style="background:rgba(124,58,237,.15);">🎓</div>
    <div class="stat-card-value">${a.overall.placementPercent}%</div>
    <div class="stat-card-label">Overall Placement %</div>
    <div class="stat-card-change up">↑ +11% vs last year</div>
  </div>
  <div class="stat-card animate-fade-in-up delay-100">
    <div class="stat-card-icon" style="background:rgba(34,211,238,.12);">💰</div>
    <div class="stat-card-value">${a.overall.avgPackage}</div>
    <div class="stat-card-label">Average Package</div>
    <div class="stat-card-change up">↑ +1.2 LPA vs last year</div>
  </div>
  <div class="stat-card animate-fade-in-up delay-200">
    <div class="stat-card-icon" style="background:rgba(16,185,129,.12);">🏆</div>
    <div class="stat-card-value">${a.overall.highestPackage}</div>
    <div class="stat-card-label">Highest Package</div>
    <div class="stat-card-change" style="color:var(--brand-cyan);">CSE Department</div>
  </div>
  <div class="stat-card animate-fade-in-up delay-300">
    <div class="stat-card-icon" style="background:rgba(245,158,11,.12);">🤝</div>
    <div class="stat-card-value">${a.overall.activeRecruiters}</div>
    <div class="stat-card-label">Active Recruiters</div>
    <div class="stat-card-change up">↑ +8 new this year</div>
  </div>
</div>

<!-- Charts row -->
<div class="an-mid">
  <div class="card animate-fade-in-up">
    <div class="card-header">
      <div><div class="card-title">Monthly Placement Trend</div><div class="card-subtitle">Cumulative offers received 2024-25</div></div>
      <div class="tabs">
        <button class="tab-btn active">Monthly</button>
        <button class="tab-btn">Weekly</button>
      </div>
    </div>
    <canvas id="placement-trend" height="260"></canvas>
  </div>
  <div class="card animate-fade-in-up delay-100">
    <div class="card-header"><div class="card-title">Package Distribution</div></div>
    <canvas id="pkg-dist" height="200"></canvas>
    <div style="margin-top:16px;display:flex;flex-direction:column;gap:6px;" id="pkg-legend"></div>
  </div>
</div>

<!-- Bottom row -->
<div class="an-bottom">
  <div class="card animate-fade-in-up">
    <div class="card-header"><div class="card-title">Department Performance</div><div class="card-subtitle">Placement % vs Avg Package</div></div>
    <div style="margin-top:8px;">
      <div style="display:grid;grid-template-columns:80px 1fr 60px 60px 70px;gap:12px;padding:0 0 8px;border-bottom:1px solid var(--border-subtle);font-size:.7rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;">
        <span>Dept</span><span>Placement %</span><span style="text-align:right">%</span><span style="text-align:right">Avg</span><span style="text-align:right">Highest</span>
      </div>
      ${a.byDept.map(d => {
        const pct = Math.round((d.placed/d.total)*100);
        return `<div class="dept-row">
          <span class="dept-name">${d.dept}</span>
          <div class="dept-bar-track"><div class="dept-bar-fill" style="width:${pct}%"></div></div>
          <span class="dept-pct">${pct}%</span>
          <span class="dept-pkg">${d.avgPkg} L</span>
          <span class="dept-high">${d.highPkg} L</span>
        </div>`;
      }).join('')}
    </div>
  </div>
  <div class="card animate-fade-in-up delay-100">
    <div class="card-header"><div class="card-title">Top Recruiters</div><div class="card-subtitle">By number of offers</div></div>
    <div style="margin-top:8px;">
      ${a.topRecruiters.map((r, i) => `
        <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border-subtle);">
          <span style="font-size:.8rem;font-weight:700;color:var(--text-muted);width:20px;">#${i+1}</span>
          <div style="flex:1;">
            <div style="font-size:.875rem;font-weight:600;color:var(--text-primary);">${r.name}</div>
            <div class="progress-bar-track" style="margin-top:4px;height:5px;"><div class="progress-bar-fill" style="width:${Math.round((r.hired/84)*100)}%"></div></div>
          </div>
          <div style="text-align:right;flex-shrink:0;">
            <div style="font-size:.875rem;font-weight:600;color:var(--text-primary);">${r.hired}</div>
            <div style="font-size:.7rem;color:var(--text-muted);">${r.avgPkg}</div>
          </div>
        </div>`).join('')}
    </div>
  </div>
</div>`;

  setTimeout(() => {
    if (typeof Chart === 'undefined') return;

    // Destroy existing charts to prevent canvas reuse error in SPA routing
    const existingChart1 = Chart.getChart('placement-trend');
    if (existingChart1) existingChart1.destroy();
    const existingChart2 = Chart.getChart('pkg-dist');
    if (existingChart2) existingChart2.destroy();

    // Placement trend
    const months = ['Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr','May','Jun'];
    new Chart(document.getElementById('placement-trend'), {
      type: 'line',
      data: {
        labels: months,
        datasets: [{
          label: 'Offers',
          data: a.monthlyPlacements,
          borderColor: '#818CF8',
          backgroundColor: 'rgba(129, 140, 248, 0.15)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#34D399',
          pointRadius: 4,
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#8B949E' } },
          x: { grid: { display: false }, ticks: { color: '#8B949E' } }
        }
      }
    });

    // Package distribution donut
    const pkgColors = ['#f87171','#FBBF24','#C084FC','#818CF8','#34D399'];
    new Chart(document.getElementById('pkg-dist'), {
      type: 'doughnut',
      data: {
        labels: a.packageDistribution.map(p => p.range),
        datasets: [{ data: a.packageDistribution.map(p => p.count), backgroundColor: pkgColors, borderWidth: 0, hoverOffset: 6 }]
      },
      options: {
        responsive: true,
        cutout: '70%',
        plugins: { legend: { display: false } }
      }
    });

    // Legend
    document.getElementById('pkg-legend').innerHTML = a.packageDistribution.map((p,i) => `
      <div style="display:flex;justify-content:space-between;font-size:.78rem;">
        <span style="display:flex;align-items:center;gap:7px;color:var(--text-secondary);">
          <span style="width:10px;height:10px;border-radius:2px;background:${pkgColors[i]};display:inline-block;"></span>${p.range}
        </span>
        <span style="font-weight:600;color:var(--text-primary);">${p.count}</span>
      </div>`).join('');
  }, 100);
}
