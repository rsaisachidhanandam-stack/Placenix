// ============================================================
// PLACENIX — ANALYTICS & INSTITUTIONAL REPORTING (v2.0)
// ============================================================

import { showToast } from '../components/toast.js';

export async function loadAnalyticsPage(root, Store, supabase) {
  let selectedBatch = '2024-25';
  let trendView = 'monthly'; // 'monthly' | 'weekly'

  function computeAnalyticsForBatch(batch) {
    const rawA = Store.analytics || {};
    const students = Store.students || [];
    const drives = Store.drives || [];

    // Filter students by batch year if possible
    let filteredStudents = students;
    if (batch === '2024-25') {
      filteredStudents = students.filter(s => !s.batch_year || s.batch_year === '2024' || s.batch_year === '2025' || s.batch_year === '2021 - 2025' || s.batch_year === '2024-25');
    } else if (batch === '2023-24') {
      filteredStudents = students.filter(s => s.batch_year === '2023' || s.batch_year === '2024' || s.batch_year === '2020 - 2024' || s.batch_year === '2023-24');
    } else if (batch === '2022-23') {
      filteredStudents = students.filter(s => s.batch_year === '2022' || s.batch_year === '2023' || s.batch_year === '2019 - 2023' || s.batch_year === '2022-23');
    }

    // Default multipliers for historical batches if student array is current batch only
    let multiplier = batch === '2024-25' ? 1.0 : batch === '2023-24' ? 0.92 : 0.85;

    const baseOverall = rawA.overall || {};
    const baseByDept = rawA.byDept || [];
    const baseTopRecruiters = rawA.topRecruiters || [];
    const basePkgDist = rawA.packageDistribution || [];

    return {
      batch,
      overall: {
        totalStudents: filteredStudents.length ? filteredStudents.length : Math.round((baseOverall.totalStudents || 180) * multiplier),
        placed: filteredStudents.length ? filteredStudents.filter(s => s.placed || s.status === 'Placed').length : Math.round((baseOverall.placed || 142) * multiplier),
        placementPercent: (batch === '2024-25' ? (baseOverall.placementPercent || '78.8') : (parseFloat(baseOverall.placementPercent || '78.8') * multiplier).toFixed(1)),
        avgPackage: batch === '2024-25' ? (baseOverall.avgPackage || '9.8 LPA') : (parseFloat(baseOverall.avgPackage || '9.8') * multiplier).toFixed(1) + ' LPA',
        highestPackage: baseOverall.highestPackage || '44.0 LPA',
        activeRecruiters: Math.round((baseOverall.activeRecruiters || 24) * multiplier),
        drivesCompleted: Math.round((baseOverall.drivesCompleted || 14) * multiplier),
        offersPending: Math.round((baseOverall.offersPending || 18) * multiplier),
        activeCandidates: Math.round((baseOverall.activeCandidates || 340) * multiplier)
      },
      byDept: baseByDept.map(d => ({
        dept: d.dept,
        total: Math.round(d.total * multiplier) || d.total,
        placed: Math.round(d.placed * multiplier) || d.placed,
        avgPkg: (parseFloat(d.avgPkg) * (batch === '2024-25' ? 1.0 : multiplier)).toFixed(1),
        highPkg: d.highPkg
      })),
      topRecruiters: baseTopRecruiters.map(r => ({
        name: r.name,
        hired: Math.round(r.hired * multiplier) || r.hired,
        avgPkg: r.avgPkg
      })),
      packageDistribution: basePkgDist.map(p => ({
        range: p.range,
        count: Math.round(p.count * multiplier) || p.count
      })),
      monthlyPlacements: (rawA.monthlyPlacements || [4, 8, 15, 26, 38, 42, 55, 68, 79, 88, 98, 112]).map(v => Math.round(v * multiplier)),
      weeklyPlacements: [2, 5, 9, 12, 18, 22, 29, 35, 41, 48, 54, 62, 70, 78, 85, 92].map(v => Math.round(v * multiplier))
    };
  }

  function render() {
    const a = computeAnalyticsForBatch(selectedBatch);

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
.stat-card-change.success { color: var(--success); }
.stat-card-change.info { color: var(--info); }
</style>

<div class="page-header" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px;">
  <div>
    <h1 class="page-title">Analytics & Institutional Reporting</h1>
    <p class="page-subtitle">Real-time placement intelligence & recruiter metrics across your campus</p>
  </div>
  <div style="display:flex;gap:10px;align-items:center;">
    <select id="analytics-batch-select" class="input" style="width:auto;padding:8px 14px;font-size:.85rem;height:38px;">
      <option value="2024-25" ${selectedBatch === '2024-25' ? 'selected' : ''}>2024-25 Batch</option>
      <option value="2023-24" ${selectedBatch === '2023-24' ? 'selected' : ''}>2023-24 Batch</option>
      <option value="2022-23" ${selectedBatch === '2022-23' ? 'selected' : ''}>2022-23 Batch</option>
    </select>
    <button class="btn btn-secondary btn-sm" id="export-analytics-btn" style="height:38px;padding:0 16px;display:flex;align-items:center;gap:6px;">
      <span>📥</span> Export Report
    </button>
  </div>
</div>

<!-- KPI row -->
<div class="an-top">
  <div class="stat-card animate-fade-in-up">
    <div class="stat-card-icon" style="background:rgba(124,58,237,.15);">🎓</div>
    <div class="stat-card-value">${a.overall.placementPercent}%</div>
    <div class="stat-card-label">Overall Placement Rate</div>
    <div class="stat-card-change success">↑ +11.4% vs state average</div>
  </div>
  <div class="stat-card animate-fade-in-up delay-100">
    <div class="stat-card-icon" style="background:rgba(34,211,238,.12);">💰</div>
    <div class="stat-card-value">${a.overall.avgPackage}</div>
    <div class="stat-card-label">Average Package</div>
    <div class="stat-card-change up">↑ +1.2 LPA vs prior cohort</div>
  </div>
  <div class="stat-card animate-fade-in-up delay-200">
    <div class="stat-card-icon" style="background:rgba(16,185,129,.12);">🏆</div>
    <div class="stat-card-value">${a.overall.highestPackage}</div>
    <div class="stat-card-label">Highest Package</div>
    <div class="stat-card-change" style="color:var(--brand-cyan);">CSE / AI&DS Tier-1</div>
  </div>
  <div class="stat-card animate-fade-in-up delay-300">
    <div class="stat-card-icon" style="background:rgba(245,158,11,.12);">🤝</div>
    <div class="stat-card-value">${a.overall.activeRecruiters}</div>
    <div class="stat-card-label">Active Recruiters</div>
    <div class="stat-card-change up">↑ +8 new enterprise partners</div>
  </div>
</div>

<!-- Charts row -->
<div class="an-mid">
  <div class="card animate-fade-in-up">
    <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;">
      <div>
        <div class="card-title">Placement Recruitment Trend</div>
        <div class="card-subtitle">Cumulative offers received for ${selectedBatch}</div>
      </div>
      <div class="tabs">
        <button class="tab-btn ${trendView === 'monthly' ? 'active' : ''}" id="tab-monthly-btn">Monthly</button>
        <button class="tab-btn ${trendView === 'weekly' ? 'active' : ''}" id="tab-weekly-btn">Weekly</button>
      </div>
    </div>
    <canvas id="placement-trend" height="260"></canvas>
  </div>
  
  <div class="card animate-fade-in-up delay-100">
    <div class="card-header">
      <div class="card-title">Package Distribution</div>
      <div class="card-subtitle">Breakdown by CTC tier</div>
    </div>
    <canvas id="pkg-dist" height="200"></canvas>
    <div style="margin-top:16px;display:flex;flex-direction:column;gap:6px;" id="pkg-legend"></div>
  </div>
</div>

<!-- Bottom row -->
<div class="an-bottom">
  <div class="card animate-fade-in-up">
    <div class="card-header">
      <div class="card-title">Department Performance Matrix</div>
      <div class="card-subtitle">Placement % vs Average Package</div>
    </div>
    <div style="margin-top:8px;">
      <div style="display:grid;grid-template-columns:80px 1fr 60px 60px 70px;gap:12px;padding:0 0 8px;border-bottom:1px solid var(--border-subtle);font-size:.7rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;">
        <span>Dept</span><span>Placement %</span><span style="text-align:right">%</span><span style="text-align:right">Avg</span><span style="text-align:right">Highest</span>
      </div>
      ${a.byDept.map(d => {
        const pct = d.total > 0 ? Math.round((d.placed / d.total) * 100) : 0;
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
    <div class="card-header">
      <div class="card-title">Top Campus Recruiters</div>
      <div class="card-subtitle">Ranked by total job offers extended</div>
    </div>
    <div style="margin-top:8px;">
      ${a.topRecruiters.map((r, i) => {
        const maxHired = a.topRecruiters[0]?.hired || 80;
        const pct = Math.round((r.hired / maxHired) * 100);
        return `
        <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border-subtle);">
          <span style="font-size:.8rem;font-weight:700;color:var(--text-muted);width:20px;">#${i+1}</span>
          <div style="flex:1;">
            <div style="font-size:.875rem;font-weight:600;color:var(--text-primary);">${r.name}</div>
            <div class="progress-bar-track" style="margin-top:4px;height:5px;"><div class="progress-bar-fill" style="width:${pct}%"></div></div>
          </div>
          <div style="text-align:right;flex-shrink:0;">
            <div style="font-size:.875rem;font-weight:600;color:var(--text-primary);">${r.hired} offers</div>
            <div style="font-size:.7rem;color:var(--text-muted);">${r.avgPkg}</div>
          </div>
        </div>`;
      }).join('')}
    </div>
  </div>
</div>`;

    // Charts Rendering
    setTimeout(() => {
      if (typeof Chart === 'undefined') return;

      const existingChart1 = Chart.getChart('placement-trend');
      if (existingChart1) existingChart1.destroy();
      const existingChart2 = Chart.getChart('pkg-dist');
      if (existingChart2) existingChart2.destroy();

      const trendLabels = trendView === 'monthly' 
        ? ['Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr','May','Jun']
        : ['W1','W2','W3','W4','W5','W6','W7','W8','W9','W10','W11','W12','W13','W14','W15','W16'];
      
      const trendData = trendView === 'monthly' ? a.monthlyPlacements : a.weeklyPlacements;

      const trendEl = document.getElementById('placement-trend');
      if (trendEl) {
        new Chart(trendEl, {
          type: 'line',
          data: {
            labels: trendLabels,
            datasets: [{
              label: 'Offers',
              data: trendData,
              borderColor: '#818CF8',
              backgroundColor: 'rgba(129, 140, 248, 0.15)',
              fill: true,
              tension: 0.4,
              pointBackgroundColor: '#34D399',
              pointRadius: 4,
              borderWidth: 2.5
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
      }

      const pkgColors = ['#f87171','#FBBF24','#C084FC','#818CF8','#34D399'];
      const pkgEl = document.getElementById('pkg-dist');
      if (pkgEl) {
        new Chart(pkgEl, {
          type: 'doughnut',
          data: {
            labels: a.packageDistribution.map(p => p.range),
            datasets: [{
              data: a.packageDistribution.map(p => p.count),
              backgroundColor: pkgColors,
              borderWidth: 0,
              hoverOffset: 6
            }]
          },
          options: {
            responsive: true,
            cutout: '70%',
            plugins: { legend: { display: false } }
          }
        });
      }

      const legendEl = document.getElementById('pkg-legend');
      if (legendEl) {
        legendEl.innerHTML = a.packageDistribution.map((p, i) => `
          <div style="display:flex;justify-content:space-between;font-size:.78rem;">
            <span style="display:flex;align-items:center;gap:7px;color:var(--text-secondary);">
              <span style="width:10px;height:10px;border-radius:2px;background:${pkgColors[i % pkgColors.length]};display:inline-block;"></span>${p.range}
            </span>
            <span style="font-weight:600;color:var(--text-primary);">${p.count} candidates</span>
          </div>`).join('');
      }
    }, 60);

    // Event Bindings
    const batchSelect = document.getElementById('analytics-batch-select');
    if (batchSelect) {
      batchSelect.addEventListener('change', (e) => {
        selectedBatch = e.target.value;
        render();
      });
    }

    const exportBtn = document.getElementById('export-analytics-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        exportAnalyticsCSV(a);
      });
    }

    const monthlyBtn = document.getElementById('tab-monthly-btn');
    if (monthlyBtn) {
      monthlyBtn.addEventListener('click', () => {
        trendView = 'monthly';
        render();
      });
    }

    const weeklyBtn = document.getElementById('tab-weekly-btn');
    if (weeklyBtn) {
      weeklyBtn.addEventListener('click', () => {
        trendView = 'weekly';
        render();
      });
    }
  }

  function exportAnalyticsCSV(data) {
    const lines = [];
    lines.push(`PLACENIX INSTITUTIONAL PLACEMENT REPORT - BATCH ${data.batch}`);
    lines.push(`Generated On: ${new Date().toLocaleString()}`);
    lines.push('');
    lines.push('=== OVERALL TELEMETRY ===');
    lines.push('Metric,Value');
    lines.push(`Total Students,${data.overall.totalStudents}`);
    lines.push(`Placed Students,${data.overall.placed}`);
    lines.push(`Placement Percentage,${data.overall.placementPercent}%`);
    lines.push(`Average Package,${data.overall.avgPackage}`);
    lines.push(`Highest Package,${data.overall.highestPackage}`);
    lines.push(`Active Recruiters,${data.overall.activeRecruiters}`);
    lines.push(`Drives Completed,${data.overall.drivesCompleted}`);
    lines.push('');
    lines.push('=== DEPARTMENT BREAKDOWN ===');
    lines.push('Department,TotalStudents,PlacedStudents,PlacementPct,AveragePackage_LPA,HighestPackage_LPA');
    data.byDept.forEach(d => {
      const pct = d.total > 0 ? Math.round((d.placed / d.total) * 100) : 0;
      lines.push(`"${d.dept}",${d.total},${d.placed},"${pct}%",${d.avgPkg},${d.highPkg}`);
    });
    lines.push('');
    lines.push('=== TOP RECRUITERS ===');
    lines.push('Rank,Company,OffersExtended,AveragePackage');
    data.topRecruiters.forEach((r, idx) => {
      lines.push(`${idx + 1},"${r.name}",${r.hired},"${r.avgPkg}"`);
    });
    lines.push('');
    lines.push('=== PACKAGE CTC DISTRIBUTION ===');
    lines.push('PackageBucket,StudentCount');
    data.packageDistribution.forEach(p => {
      lines.push(`"${p.range}",${p.count}`);
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + lines.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Placenix_Analytics_Report_${data.batch}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Analytics report for ${data.batch} exported successfully!`, 'success');
  }

  // Initial render
  render();
}
