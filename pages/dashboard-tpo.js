import { showToast } from '../components/toast.js';

export async function loadTPODash(root, Store) {
  const a = Store.analytics.overall;
  root.innerHTML = `
<style>
.tpo-kpi{display:grid;grid-template-columns:repeat(4,1fr);gap:18px;margin-bottom:24px;}
.tpo-mid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px;}
.tpo-bottom{display:grid;grid-template-columns:2fr 1fr;gap:20px;}
.student-name-hover:hover { color: var(--brand-primary) !important; }

/* Stat Card Premium Styling */
.stat-card {
  background: var(--bg-card, #0f0f12);
  border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.05));
  border-radius: var(--r-xl, 16px);
  padding: 24px;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  min-height: 148px;
}
.stat-card:hover {
  transform: translateY(-4px);
  border-color: var(--brand-primary, #7c3aed);
  box-shadow: 0 12px 24px -10px rgba(124, 58, 237, 0.2);
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
  border: 1px solid rgba(255, 255, 255, 0.03);
}
.stat-card-value {
  font-size: 26px;
  font-weight: 800;
  color: #fff;
  line-height: 1.1;
  margin-bottom: 4px;
  letter-spacing: -0.02em;
  font-family: 'Space Grotesk', sans-serif;
}
.stat-card-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted, #64748b);
  margin-bottom: 8px;
}
.stat-card-change {
  font-size: 9.5px;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  color: var(--text-description, #a1a1aa);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-top: auto;
}
.stat-card-change.success {
  color: #10b981;
}
.stat-card-change.info {
  color: #0ea5e9;
}
</style>
<div class="page-header">
  <div style="display:flex;justify-content:space-between;align-items:center;">
    <div><h1 class="page-title">TPO Operations Dashboard</h1><p class="page-subtitle">${Store.session.user?.institution || 'Placenix Institutional Node'} · ${Store.session.user?.sessionYear || '2024-25'} Placement Season</p></div>
    <div style="display:flex;gap:10px;align-items:center;">
      <button class="btn btn-secondary btn-sm" id="tpo-export-btn" style="height:36px; padding: 0 16px; font-size:12px; font-weight:700;">📥 Export Report</button>
      <a href="#drives" onclick="window.location.hash='drives'" class="btn btn-primary btn-sm" style="text-decoration:none; height:36px; padding: 0 16px; font-size:12px; font-weight:700; display:inline-flex; align-items:center; justify-content:center;">+ Create Drive</a>
    </div>
  </div>
</div>

<div class="tpo-kpi">
  ${[
    ['🎓',a.placementPercent+'%','Placement Rate','Institutional KPI','success','rgba(124,58,237,.15)'],
    ['💰',a.avgPackage,'Avg. Package','Current Mean','success','rgba(34,211,238,.12)'],
    [' 🏆',a.highestPackage,'Highest Package','Season Peak','info','rgba(16,185,129,.12)'],
    ['🤝',a.activeRecruiters,'Active Recruiters','Partner Network','success','rgba(245,158,11,.12)'],
  ].map(([ic,val,lbl,chg,ct,bg])=>`
    <div class="stat-card animate-fade-in-up">
      <div class="stat-card-icon" style="background:${bg};">${ic}</div>
      <div class="stat-card-value">${val}</div>
      <div class="stat-card-label">${lbl}</div>
      <div class="stat-card-change ${ct}">${chg}</div>
    </div>`).join('')}
</div>

<div class="tpo-mid">
  <div class="card animate-fade-in-up">
    <div class="card-header"><div class="card-title">Monthly Placement Trend</div></div>
    <canvas id="tpo-trend" height="200"></canvas>
  </div>
  <div class="card animate-fade-in-up delay-100">
    <div class="card-header"><div class="card-title">Department Placement %</div></div>
    <canvas id="dept-chart" height="200"></canvas>
  </div>
</div>

<div class="tpo-bottom">
  <!-- Active drives table -->
  <div class="card animate-fade-in-up">
    <div class="card-header">
      <div class="card-title">Active Placement Drives</div>
      <a href="#drives" onclick="window.location.hash='drives'" class="btn btn-sm btn-ghost" style="text-decoration:none;">Manage All →</a>
    </div>
    <div class="table-wrapper">
      <table class="table">
        <thead><tr><th>Company</th><th>Role</th><th>Status</th><th>Applicants</th><th>Deadline</th></tr></thead>
        <tbody>
          ${Store.drives.map(d=>`
            <tr>
              <td><div class="table-avatar"><div class="table-avatar-img">${d.logo || '🏢'}</div><strong>${d.company}</strong></div></td>
              <td>${d.role}</td>
              <td><span class="badge badge-${d.status==='Open'?'success':d.status==='Upcoming'?'info':'neutral'} badge-dot">${d.status}</span></td>
              <td>
                <button class="view-applicants-btn btn btn-secondary btn-sm" data-id="${d.id}" data-company="${d.company}" style="padding:4px 10px; font-size:11px; border-radius:6px; background:rgba(255,255,255,0.02); border-color:var(--border-main); color:var(--text-main); font-weight:600; cursor:pointer;">
                  👥 ${(Store.kanban ? Object.values(Store.kanban).flat().filter(c => String(c.driveId) === String(d.id) || (!c.driveId && c.drive === d.company)).length : 0) || d.applicants || 0} View
                </button>
              </td>
              <td style="color:var(--text-muted)">${d.deadline}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>
  </div>
  <!-- Quick actions -->
  <div style="display:flex;flex-direction:column;gap:16px;">
    <div class="ai-widget animate-fade-in-up delay-100">
      <div class="ai-widget-header"><span class="ai-badge">🤖 AI</span><span class="ai-widget-title">Today's Insights</span></div>
      <div class="ai-widget-body" style="display:flex;flex-direction:column;gap:8px;">
        <div style="font-size:.8rem;color:var(--text-secondary);" id="tpo-dynamic-insight-text">💡 <strong>14 students</strong> eligible for Zoho haven't applied yet. Send reminder?</div>
        <div style="font-size:.8rem;color:var(--text-secondary);">📈 CSE dept is trending <strong>+18%</strong> above last year's placement rate.</div>
        <div style="font-size:.8rem;color:var(--text-secondary);">⚠️ <strong>3 students</strong> have CGPA borderline for TCS. Consider appeal process.</div>
        <button class="btn btn-primary btn-sm" style="margin-top:8px;" id="tpo-send-reminders-btn">Send Drive Reminders →</button>
      </div>
    </div>
    <div class="card animate-fade-in-up delay-200">
      <div class="card-title" style="margin-bottom:12px;">Quick Actions</div>
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${[['🎯','Create New Drive','drives'],['🔀','View Pipeline','kanban'],['📅','Slot Allocation','slot-allocation']].map(([ic,lbl,rt])=>`
          <a href="#${rt}" onclick="window.location.hash='${rt}'" class="btn btn-secondary" style="justify-content:flex-start;text-decoration:none;">${ic} ${lbl}</a>`).join('')}
      </div>
    </div>
  </div>
</div>

<!-- Applicants Modal -->
<div id="applicants-modal" class="modal-overlay" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.85); backdrop-filter:blur(15px); z-index:1001; align-items:center; justify-content:center; padding:40px;">
  <div class="card-ent" style="max-width:600px; width:100%; padding:48px; position:relative; background:#0c0c0e; border: 1px solid var(--border-main); border-radius: 16px;">
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:32px;">
      <h3 id="modal-company-title" class="h2-ent" style="font-size:24px; font-weight:800; color:#fff;">Applied Candidates</h3>
      <button style="background:none; border:none; color:var(--text-muted); cursor:pointer; font-size:24px;" onclick="this.closest('#applicants-modal').style.display='none'">✕</button>
    </div>
    <div id="applicants-list" style="max-height:400px; overflow-y:auto; display:flex; flex-direction:column; gap:16px;">
      <!-- Applicants will be injected here -->
    </div>
  </div>
</div>

<!-- Export Modal -->
<div id="export-modal" class="modal-overlay" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.85); backdrop-filter:blur(15px); z-index:1001; align-items:center; justify-content:center; padding:40px;">
  <div class="card-ent animate-fade-in-up" style="max-width:540px; width:100%; padding:36px; position:relative; background:#0c0c0e; border:1px solid var(--border-main); border-radius:16px;">
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:28px;">
      <h3 style="font-size:20px; font-weight:800; color:#fff; display:flex; align-items:center; gap:8px;">📥 Operations Exporter</h3>
      <button style="background:none; border:none; color:var(--text-muted); cursor:pointer; font-size:22px;" onclick="document.getElementById('export-modal').style.display='none'">✕</button>
    </div>
    <p style="color:var(--text-muted); font-size:13px; margin-bottom:24px; line-height:1.5;">Select the operational data summary to download from your institutional workspace.</p>
    
    <div style="display:flex; flex-direction:column; gap:14px;">
      <button id="export-brief-btn" style="width:100%; text-align:left; background:rgba(255,255,255,0.01); border:1px solid var(--border-main); padding:16px 20px; border-radius:12px; display:flex; align-items:center; justify-content:space-between; cursor:pointer; transition:all 0.15s ease;" onmouseover="this.style.borderColor='var(--brand-primary)'; this.style.background='rgba(255,255,255,0.02)';" onmouseout="this.style.borderColor='var(--border-main)'; this.style.background='rgba(255,255,255,0.01)';">
        <div>
          <div style="font-weight:700; color:#fff; font-size:14px;">📄 Executive Summary Brief</div>
          <div style="font-size:11px; color:var(--text-muted); margin-top:4px;">Institutional KPIs, department statistics, and month-by-month trends in a formatted text report.</div>
        </div>
        <span style="color:var(--brand-primary); font-size:18px;">➔</span>
      </button>

      <button id="export-candidates-btn" style="width:100%; text-align:left; background:rgba(255,255,255,0.01); border:1px solid var(--border-main); padding:16px 20px; border-radius:12px; display:flex; align-items:center; justify-content:space-between; cursor:pointer; transition:all 0.15s ease;" onmouseover="this.style.borderColor='var(--brand-primary)'; this.style.background='rgba(255,255,255,0.02)';" onmouseout="this.style.borderColor='var(--border-main)'; this.style.background='rgba(255,255,255,0.01)';">
        <div>
          <div style="font-weight:700; color:#fff; font-size:14px;">👥 Candidates Placement Registry</div>
          <div style="font-size:11px; color:var(--text-muted); margin-top:4px;">Detailed spreadsheet of all students, CGPA, ATS scores, placement status, and package metrics.</div>
        </div>
        <span style="color:var(--brand-primary); font-size:18px;">➔</span>
      </button>

      <button id="export-drives-btn" style="width:100%; text-align:left; background:rgba(255,255,255,0.01); border:1px solid var(--border-main); padding:16px 20px; border-radius:12px; display:flex; align-items:center; justify-content:space-between; cursor:pointer; transition:all 0.15s ease;" onmouseover="this.style.borderColor='var(--brand-primary)'; this.style.background='rgba(255,255,255,0.02)';" onmouseout="this.style.borderColor='var(--border-main)'; this.style.background='rgba(255,255,255,0.01)';">
        <div>
          <div style="font-weight:700; color:#fff; font-size:14px;">💼 Recruitment Drives Registry</div>
          <div style="font-size:11px; color:var(--text-muted); margin-top:4px;">Detailed spreadsheet of all active and historical placement drives, roles, requirements, and applicants.</div>
        </div>
        <span style="color:var(--brand-primary); font-size:18px;">➔</span>
      </button>
    </div>
  </div>
</div>

<!-- Broadcaster Modal -->
<div id="broadcaster-modal" class="modal-overlay" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.85); backdrop-filter:blur(15px); z-index:1001; align-items:center; justify-content:center; padding:40px;">
  <div class="card-ent animate-fade-in-up" style="max-width:620px; width:100%; padding:36px; position:relative; background:#0c0c0e; border:1px solid var(--border-main); border-radius:16px; display:flex; flex-direction:column; gap:24px;">
    <div style="display:flex; justify-content:space-between; align-items:center;">
      <h3 style="font-size:20px; font-weight:800; color:#fff; display:flex; align-items:center; gap:8px;">📢 AI Smart Broadcaster</h3>
      <button style="background:none; border:none; color:var(--text-muted); cursor:pointer; font-size:22px;" onclick="document.getElementById('broadcaster-modal').style.display='none'">✕</button>
    </div>
    
    <div class="input-node">
      <label class="label-ent" style="color:#fff; margin-bottom:8px; display:block; font-size:11px;">Target Recruitment Drive</label>
      <select id="broadcaster-drive-select" class="input" style="width:100%; height:40px; font-size:13px; background-color:var(--bg-card); color:var(--text-main); border:1px solid var(--border-main); border-radius:8px;">
        <!-- Filled dynamically -->
      </select>
    </div>

    <!-- Candidate List Panel -->
    <div class="input-node" style="display:flex; flex-direction:column; gap:8px;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <label class="label-ent" style="color:#fff; margin:0; font-size:11px;">Eligible Unregistered Candidates</label>
        <span id="broadcaster-candidate-count" style="font-size:11px; font-weight:700; color:var(--brand-primary);">0 students</span>
      </div>
      
      <div id="broadcaster-candidates-list" style="max-height:180px; overflow-y:auto; border:1px solid var(--border-main); border-radius:10px; background:rgba(0,0,0,0.15); padding:10px; display:flex; flex-direction:column; gap:8px;">
        <!-- Filled dynamically -->
      </div>
    </div>

    <!-- Customized Message -->
    <div class="input-node">
      <label class="label-ent" style="color:#fff; margin-bottom:8px; display:block; font-size:11px;">Customized AI Reminder Message</label>
      <textarea id="broadcaster-message-text" class="input" style="width:100%; height:90px; font-size:12.5px; border-radius:8px; padding:12px; resize:none; background-color:var(--bg-card); color:#fff; border:1px solid var(--border-main); line-height:1.5;"></textarea>
    </div>

    <div style="display:flex; justify-content:flex-end; gap:12px;">
      <button class="btn btn-secondary" onclick="document.getElementById('broadcaster-modal').style.display='none'" style="height:40px; padding:0 20px; border-radius:8px; font-size:12.5px; font-weight:700; cursor:pointer;">Cancel</button>
      <button id="broadcaster-submit-btn" class="btn btn-primary" style="height:40px; padding:0 24px; border-radius:8px; font-size:12.5px; font-weight:700; cursor:pointer;">➔ Broadcast Reminders</button>
    </div>
  </div>
</div>`;

  setTimeout(() => {
    if (typeof Chart === 'undefined') return;
    const months = ['Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr','May','Jun'];
    new Chart(document.getElementById('tpo-trend'), {
      type: 'line',
      data: { labels: months, datasets: [{ label: 'Offers', data: Store.analytics.monthlyPlacements, borderColor: '#7C3AED', backgroundColor: 'rgba(124,58,237,.1)', fill: true, tension: 0.4, pointBackgroundColor: '#22D3EE', pointRadius: 4 }] },
      options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { grid: { color: 'rgba(255,255,255,.05)' }, ticks: { color: '#64748B' } }, x: { grid: { display: false }, ticks: { color: '#64748B' } } } }
    });
    const depts = Store.analytics.byDept;
    new Chart(document.getElementById('dept-chart'), {
      type: 'bar',
      data: {
        labels: depts.map(d=>d.dept),
        datasets: [{
          label: 'Placement %',
          data: depts.map(d=>d.total ? Math.round((d.placed/d.total)*100) : 0),
          backgroundColor: ['rgba(124,58,237,.7)','rgba(34,211,238,.7)','rgba(16,185,129,.7)','rgba(245,158,11,.7)','rgba(239,68,68,.7)','rgba(59,130,246,.7)'],
          borderRadius: 6,
        }]
      },
      options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { max: 100, grid: { color: 'rgba(255,255,255,.05)' }, ticks: { color: '#64748B', callback: v => v+'%' } }, x: { grid: { display: false }, ticks: { color: '#64748B' } } } }
    });

    // ── REPORT EXPORT EVENT BINDING ──
    const exportModal = document.getElementById('export-modal');
    const exportBtn = document.getElementById('tpo-export-btn');
    if (exportBtn && exportModal) {
      exportBtn.onclick = () => {
        exportModal.style.display = 'flex';
      };
    }

    document.getElementById('export-brief-btn').onclick = () => {
      const overall = Store.analytics.overall;
      const depts = Store.analytics.byDept;
      const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      
      let brief = `============================================================\n`;
      brief += `PLACENIX CAMPUS RECRUITMENT OPERATIONS — EXECUTIVE SUMMARY\n`;
      brief += `Institution : ${Store.session.user?.institution || 'Placenix Institutional Node'}\n`;
      brief += `Generated At: ${today}\n`;
      brief += `Placement Season: ${Store.session.user?.sessionYear || '2024-25'}\n`;
      brief += `============================================================\n\n`;
      
      brief += `1. INSTITUTIONAL KEY PERFORMANCE INDICATORS\n`;
      brief += `------------------------------------------------------------\n`;
      brief += `• Overall Placement Rate  : ${overall.placementPercent}%\n`;
      brief += `• Placed Candidates Count : ${overall.placed} / ${overall.totalStudents} students\n`;
      brief += `• Average Salary Package  : ${overall.avgPackage}\n`;
      brief += `• Highest Salary Package  : ${overall.highestPackage}\n`;
      brief += `• Active Corporate Partners: ${overall.activeRecruiters} companies\n`;
      brief += `• Drives Completed        : ${overall.drivesCompleted}\n`;
      brief += `• Offers Shortlisted/Pending: ${overall.offersPending} candidates\n`;
      brief += `• Hired Pipeline Volume    : ${overall.activeCandidates} active applications\n\n`;
      
      brief += `2. DEPARTMENTAL PERFORMANCE TELEMETRY\n`;
      brief += `------------------------------------------------------------\n`;
      depts.forEach(d => {
        const rate = d.total ? ((d.placed / d.total) * 100).toFixed(1) : '0.0';
        brief += `• ${d.dept.toUpperCase()} Department:\n`;
        brief += `  - Total Candidates: ${d.total}\n`;
        brief += `  - Hired Students  : ${d.placed}\n`;
        brief += `  - Hired Percentage: ${rate}%\n`;
      });
      brief += `\n`;
      
      brief += `3. ACTIVE PLACEMENT DRIVES DIRECTORY\n`;
      brief += `------------------------------------------------------------\n`;
      Store.drives.forEach((d, idx) => {
        brief += `${idx + 1}. ${d.company.toUpperCase()} — ${d.role}\n`;
        brief += `   - Package  : ${d.package}\n`;
        brief += `   - Min CGPA : ${d.min_cgpa || 'None'}\n`;
        brief += `   - Applicants: ${d.applicants || 0}\n`;
        brief += `   - Status   : ${d.status}\n`;
        brief += `   - Deadline : ${d.deadline}\n`;
      });
      brief += `\n============================================================\n`;
      brief += `PLACENIX — GENERATED VIA CAMPUS RECRUITMENT OPERATIONS SYSTEM\n`;
      brief += `============================================================\n`;
      
      const blob = new Blob([brief], { type: 'text/plain;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `placenix_executive_brief_${(Store.session.user?.sessionYear || '2024-25').replace(/[^a-zA-Z0-9]/g, '_')}.txt`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showToast("Executive Brief exported successfully!", "success");
      exportModal.style.display = 'none';
    };

    document.getElementById('export-candidates-btn').onclick = () => {
      const headers = ['Candidate Name', 'Department', 'CGPA', 'ATS Resume Score', 'Employability Rating', 'Placement Status', 'Placed Company', 'Offered Package (LPA)'];
      const rows = Store.students.map(s => [
        s.name,
        s.dept,
        s.cgpa,
        s.atsScore || 'N/A',
        s.empScore || 'N/A',
        s.status,
        s.company || '—',
        s.placed || s.status === 'Placed' ? (s.package || '7.5') : '—'
      ]);
      
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `placenix_candidates_registry_${(Store.session.user?.sessionYear || '2024-25').replace(/[^a-zA-Z0-9]/g, '_')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showToast("Candidate Placement Registry exported!", "success");
      exportModal.style.display = 'none';
    };

    document.getElementById('export-drives-btn').onclick = () => {
      const headers = ['Company Name', 'Role Title', 'Salary Package', 'Min Eligibility CGPA', 'Registered Applicants', 'Recruitment Status', 'Registration Deadline'];
      const rows = Store.drives.map(d => [
        d.company,
        d.role,
        d.package,
        d.min_cgpa || '0.0',
        d.applicants || 0,
        d.status,
        d.deadline
      ]);
      
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `placenix_recruitment_drives_${(Store.session.user?.sessionYear || '2024-25').replace(/[^a-zA-Z0-9]/g, '_')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showToast("Recruitment Drives Registry exported!", "success");
      exportModal.style.display = 'none';
    };


    // ── AI OUTBOUND BROADCASTER LOGIC ──
    const broadcasterModal = document.getElementById('broadcaster-modal');
    const remindersBtn = document.getElementById('tpo-send-reminders-btn');
    const select = document.getElementById('broadcaster-drive-select');
    const listContainer = document.getElementById('broadcaster-candidates-list');
    const countContainer = document.getElementById('broadcaster-candidate-count');
    const msgBox = document.getElementById('broadcaster-message-text');

    function getUnregisteredEligible(drive) {
      const appliedCandidateIds = new Set();
      const stages = ['applied', 'shortlisted', 'aptitude', 'technical', 'hr', 'selected'];
      stages.forEach(stg => {
        (Store.kanban?.[stg] || []).forEach(card => {
          if (String(card.driveId) === String(drive.id) || (card.drive && card.drive.toLowerCase().includes(drive.company.toLowerCase()))) {
            appliedCandidateIds.add(String(card.id));
          }
        });
      });
      
      const minCgpa = parseFloat(drive.min_cgpa) || 0;
      return Store.students.filter(student => {
        const cgpa = parseFloat(student.cgpa) || 0;
        return cgpa >= minCgpa && !appliedCandidateIds.has(String(student.id)) && student.status !== 'Placed';
      });
    }

    function updateCandidatesListForDrive(drive) {
      const list = getUnregisteredEligible(drive);
      countContainer.innerText = `${list.length} students`;
      
      if (list.length === 0) {
        listContainer.innerHTML = `<div style="padding:20px; text-align:center; color:var(--text-muted); font-size:12px;">All eligible students have registered for this drive!</div>`;
      } else {
        listContainer.innerHTML = list.map(student => `
          <label style="display:flex; align-items:center; justify-content:space-between; padding:10px 12px; background:rgba(255,255,255,0.02); border:1px solid var(--border-subtle); border-radius:8px; cursor:pointer; margin-bottom: 4px;">
            <div style="display:flex; align-items:center; gap:10px;">
              <input type="checkbox" class="broadcaster-student-checkbox" value="${student.id}" checked style="accent-color:var(--brand-primary); cursor:pointer;">
              <div style="width:24px; height:24px; border-radius:50%; background:var(--bg-elevated); display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:800; color:var(--brand-primary); border:1px solid var(--border-main);">${student.avatar || student.name.substring(0,2).toUpperCase()}</div>
              <div>
                <span style="font-size:12.5px; font-weight:700; color:#fff;">${student.name}</span>
                <span style="font-size:9.5px; color:var(--text-muted); margin-left:6px;">(${student.dept} · CGPA: ${student.cgpa})</span>
              </div>
            </div>
            <span class="badge badge-warning" style="font-size:9px;">Unregistered</span>
          </label>
        `).join('');
      }
      
      msgBox.value = `⚠️ Urgent Action Required: You are highly eligible for the ${drive.company} — ${drive.role} drive based on your academic profile. Registration closes on ${drive.deadline}. Please complete your application inside your opportunity portal immediately.`;
    }

    // Dynamic AI Insight Text Setup
    const insightText = document.getElementById('tpo-dynamic-insight-text');
    const firstOpenDrive = Store.drives.find(d => d.status === 'Open');
    if (insightText && firstOpenDrive) {
      const eligibleCount = getUnregisteredEligible(firstOpenDrive).length;
      insightText.innerHTML = `💡 <strong>${eligibleCount} students</strong> eligible for ${firstOpenDrive.company} haven't applied yet. Send reminder?`;
    }

    if (remindersBtn && broadcasterModal) {
      remindersBtn.onclick = () => {
        const openDrives = Store.drives.filter(d => d.status === 'Open');
        if (openDrives.length === 0) {
          showToast("No active open drives found to broadcast reminders.", "warning");
          return;
        }
        
        select.innerHTML = openDrives.map(d => `<option value="${d.id}">${d.company} — ${d.role} (Min CGPA: ${d.min_cgpa || '0.0'})</option>`).join('');
        const activeDrive = openDrives[0];
        updateCandidatesListForDrive(activeDrive);
        
        broadcasterModal.style.display = 'flex';
      };
    }

    select.onchange = (e) => {
      const openDrives = Store.drives.filter(d => d.status === 'Open');
      const selectedDrive = openDrives.find(d => String(d.id) === String(e.target.value));
      if (selectedDrive) updateCandidatesListForDrive(selectedDrive);
    };

    document.getElementById('broadcaster-submit-btn').onclick = () => {
      const openDrives = Store.drives.filter(d => d.status === 'Open');
      const selectedDrive = openDrives.find(d => String(d.id) === String(select.value));
      if (!selectedDrive) return;

      const checkedCheckboxes = listContainer.querySelectorAll('.broadcaster-student-checkbox:checked');
      const studentIds = Array.from(checkedCheckboxes).map(cb => cb.value);
      if (studentIds.length === 0) {
        showToast("Please select at least one student to broadcast reminders.", "warning");
        return;
      }

      const messageText = msgBox.value;
      studentIds.forEach(sId => {
        const student = Store.students.find(s => String(s.id) === String(sId));
        Store.notifications.unshift({
          id: 'n_' + Date.now() + Math.random().toString(36).substr(2, 4),
          type: 'drive',
          studentId: sId,
          studentName: student ? student.name : 'Candidate',
          title: `🚨 Registration Reminder: ${selectedDrive.company}`,
          desc: messageText,
          time: 'Just now',
          read: false
        });
      });

      localStorage.setItem('placenix_notifications', JSON.stringify(Store.notifications));
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('store-updated'));

      showToast(`Successfully broadcasted drive reminders to ${studentIds.length} students!`, "success");
      broadcasterModal.style.display = 'none';

      // Update the live insight text immediately
      if (insightText && firstOpenDrive) {
        const eligibleCount = getUnregisteredEligible(firstOpenDrive).length;
        insightText.innerHTML = `💡 <strong>${eligibleCount} students</strong> eligible for ${firstOpenDrive.company} haven't applied yet. Send reminder?`;
      }
    };


    // ── APPLICANTS VIEW MODAL LOGIC ──
    function showApplicantsModal(driveId, company) {
      const modal = document.getElementById('applicants-modal');
      const list = document.getElementById('applicants-list');
      const title = document.getElementById('modal-company-title');
      
      title.innerText = `${company} — Candidate Registry`;
      
      const allCandidates = [];
      if (Store.kanban) {
        Object.entries(Store.kanban).forEach(([stage, candidates]) => {
          if (!Array.isArray(candidates)) return;
          candidates.forEach(c => {
            if (String(c.driveId) === String(driveId) || (c.drive && c.drive.toLowerCase().includes(company.toLowerCase()))) {
              allCandidates.push({ ...c, stage: stage });
            }
          });
        });
      }
      
      const stageColors = {
        applied: { text: '#a1a1aa', bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.08)' },
        shortlisted: { text: '#3b82f6', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.2)' },
        aptitude: { text: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)' },
        technical: { text: '#8b5cf6', bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.2)' },
        hr: { text: '#0ea5e9', bg: 'rgba(14,165,233,0.1)', border: 'rgba(14,165,233,0.2)' },
        selected: { text: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.2)' }
      };
      
      if (allCandidates.length === 0) {
        list.innerHTML = `<div style="padding:40px; text-align:center; color:var(--text-muted); font-size: 13.5px;">No applications recorded in the pipeline for this organization.</div>`;
      } else {
        list.innerHTML = allCandidates.map(c => {
          const col = stageColors[c.stage] || stageColors.applied;
          return `
            <div style="padding:16px; background:rgba(255,255,255,0.02); border:1px solid var(--border-subtle); border-radius:12px; display:flex; justify-content:space-between; align-items:center;">
              <a href="#student-details?id=${c.id}" style="text-decoration:none; display:flex; align-items:center; gap:16px; color:inherit;" onclick="const m = document.getElementById('applicants-modal'); if (m) m.style.display='none';">
                <div style="width:36px; height:36px; border-radius:50%; background:var(--gradient-brand, linear-gradient(135deg, #7c3aed, #22d3ee)); display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:800; color:#fff; border: 1px solid rgba(255, 255, 255, 0.1);">${c.avatar || '🎓'}</div>
                <div>
                  <div style="font-weight:700; color:#fff; font-size:14.5px; transition:color var(--t-fast);" class="student-name-hover">${c.name}</div>
                  <div style="font-size:11px; color:var(--text-muted);">${c.dept}</div>
                </div>
              </a>
              <div style="font-size:10px; font-weight:800; color:${col.text}; background:${col.bg}; padding:6px 12px; border-radius:100px; border: 1px solid ${col.border}; text-transform:uppercase; letter-spacing:0.02em;">${c.stage}</div>
            </div>`;
        }).join('');
      }
      
      modal.style.display = 'flex';
    }

    root.querySelectorAll('.view-applicants-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const driveId = e.currentTarget.getAttribute('data-id');
        const company = e.currentTarget.getAttribute('data-company');
        showApplicantsModal(driveId, company);
      });
    });
  }, 100);
}

export async function loadAdminDash(root, Store) {
  root.innerHTML = `
<style>
.student-name-hover:hover { color: var(--brand-primary) !important; }
</style>
<div class="page-header"><h1 class="page-title">University Admin Dashboard</h1><p class="page-subtitle">Institution-wide overview & administration</p></div>
<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:18px;margin-bottom:24px;">
  ${[['🎓','1,247','Total Students','2024-25 batch','rgba(124,58,237,.15)'],['✅','67.6%','Placement Rate','Best in 5 years','rgba(34,211,238,.12)'],['🤝','48','Recruiters','Active this season','rgba(16,185,129,.12)'],['💰','8.4 LPA','Avg Package','↑ from 7.2 LPA','rgba(245,158,11,.12)']].map(([ic,v,l,c,bg])=>`
    <div class="stat-card animate-fade-in-up"><div class="stat-card-icon" style="background:${bg};">${ic}</div><div class="stat-card-value">${v}</div><div class="stat-card-label">${l}</div><div class="stat-card-change up">${c}</div></div>`).join('')}
</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px;">
  <div class="card animate-fade-in-up">
    <div class="card-header"><div class="card-title">Placement Overview by Department</div></div>
    <canvas id="admin-chart" height="220"></canvas>
  </div>
  <div class="card animate-fade-in-up delay-100">
    <div class="card-header"><div class="card-title">Student Readiness Distribution</div><span class="ai-badge">🤖 AI</span></div>
    <canvas id="readiness-chart" height="220"></canvas>
  </div>
</div>
<div class="card animate-fade-in-up">
  <div class="card-header"><div class="card-title">Student Performance Table</div><div style="display:flex;gap:10px;"><button class="btn btn-sm btn-secondary">📥 Export</button></div></div>
  <div class="table-wrapper">
    <table class="table">
      <thead><tr><th>Student</th><th>Dept</th><th>CGPA</th><th>ATS Score</th><th>Emp. Score</th><th>Status</th><th>Company</th><th style="text-align:right;">Action</th></tr></thead>
      <tbody>
        ${Store.students.map(s=>`
          <tr>
            <td>
              <a href="#student-details?id=${s.id}" style="text-decoration:none; display:flex; align-items:center; gap:12px; color:inherit;">
                <div class="table-avatar"><div class="table-avatar-img">${s.avatar || (s.name ? s.name.substring(0, 2).toUpperCase() : '🎓')}</div><div style="font-weight:700; transition:color var(--t-fast);" class="student-name-hover">${s.name}</div></div>
              </a>
            </td>
            <td><span class="badge badge-neutral">${s.dept}</span></td>
            <td><strong>${s.cgpa}</strong></td>
            <td><span style="color:${s.atsScore>=80?'var(--success)':s.atsScore>=65?'var(--warning)':'var(--danger)'};">${s.atsScore}</span></td>
            <td><span style="color:${s.empScore>=80?'var(--success)':s.empScore>=65?'var(--warning)':'var(--danger)'};">${s.empScore}</span></td>
            <td><span class="badge badge-${s.status==='Placed'?'success':s.status==='Shortlisted'?'warning':'neutral'} badge-dot">${s.status}</span></td>
            <td style="color:var(--brand-cyan)">${s.company||'—'}</td>
            <td style="text-align:right;">
              <a href="#student-details?id=${s.id}" class="btn-premium-ghost" style="text-decoration:none; display:inline-flex; align-items:center; height:32px; font-size:10.5px; border-radius:8px; padding:0 12px;">🔍 View</a>
            </td>
          </tr>`).join('')}
      </tbody>
    </table>
  </div>
</div>`;
  setTimeout(()=>{
    if(typeof Chart==='undefined')return;
    const d=Store.analytics.byDept;
    new Chart(document.getElementById('admin-chart'),{type:'bar',data:{labels:d.map(x=>x.dept),datasets:[{label:'Placed',data:d.map(x=>x.placed),backgroundColor:'rgba(124,58,237,.7)',borderRadius:6},{label:'Eligible',data:d.map(x=>x.total),backgroundColor:'rgba(255,255,255,.08)',borderRadius:6}]},options:{responsive:true,plugins:{legend:{labels:{color:'#64748B'}}},scales:{y:{grid:{color:'rgba(255,255,255,.05)'},ticks:{color:'#64748B'}},x:{grid:{display:false},ticks:{color:'#64748B'}}}}});
    new Chart(document.getElementById('readiness-chart'),{type:'doughnut',data:{labels:['Highly Ready (85+)','Ready (65-84)','Needs Work (45-64)','Critical (<45)'],datasets:[{data:[248,412,380,207],backgroundColor:['#10B981','#7C3AED','#F59E0B','#EF4444'],borderWidth:0,hoverOffset:4}]},options:{responsive:true,cutout:'65%',plugins:{legend:{position:'bottom',labels:{color:'#64748B',font:{size:10},boxWidth:10}}}}});
  },100);
}
