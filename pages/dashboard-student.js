export async function loadStudentDash(root, Store) {
  const p = Store.studentProfile;
  const user = Store.session.user;
  root.innerHTML = `
<style>
.dash-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:20px;margin-bottom:24px;}
.dash-mid{display:grid;grid-template-columns:2fr 1fr;gap:20px;margin-bottom:24px;}
.dash-bottom{display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;}
.emp-meter-wrap{position:relative;width:140px;height:140px;margin:0 auto;}
.emp-meter-wrap svg{transform:rotate(-90deg);}
.emp-meter-label{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;}
.emp-meter-val{font-family:var(--font-display);font-size:1.75rem;font-weight:800;color:var(--text-primary);}
.emp-meter-sub{font-size:.7rem;color:var(--text-muted);}
.skill-bar{display:flex;flex-direction:column;gap:4px;margin-bottom:12px;}
.skill-bar-row{display:flex;align-items:center;gap:10px;}
.skill-bar-label{font-size:.78rem;color:var(--text-secondary);width:130px;flex-shrink:0;}
.skill-bar-track{flex:1;height:6px;background:rgba(255,255,255,.06);border-radius:99px;overflow:hidden;}
.skill-bar-fill{height:100%;border-radius:99px;background:var(--gradient-brand);transition:width 1.2s ease;}
.skill-bar-pct{font-size:.75rem;color:var(--text-muted);width:32px;text-align:right;flex-shrink:0;}
.app-row{display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border-subtle);gap:12px;}
.app-row:last-child{border-bottom:none;}
.app-company{font-size:.875rem;font-weight:600;color:var(--text-primary);}
.app-role{font-size:.75rem;color:var(--text-muted);}
.app-date{font-size:.75rem;color:var(--text-muted);}
.prob-ring-wrap{position:relative;width:120px;height:120px;margin:16px auto 8px;}
.prob-ring-wrap svg{transform:rotate(-135deg);}
.prob-ring-label{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;}
.welcome-banner{background:linear-gradient(135deg,rgba(124,58,237,.15) 0%,rgba(34,211,238,.08) 100%);border:1px solid rgba(124,58,237,.25);border-radius:16px;padding:24px 28px;display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;}
.welcome-text h2{font-family:var(--font-display);font-size:1.4rem;font-weight:800;margin-bottom:6px;}
.welcome-text p{color:var(--text-secondary);font-size:.875rem;}
.welcome-actions{display:flex;gap:10px;flex-shrink:0;}
@media(max-width:1100px){.dash-grid{grid-template-columns:repeat(2,1fr);}.dash-mid,.dash-bottom{grid-template-columns:1fr;}}
@media(max-width:600px){.dash-grid{grid-template-columns:1fr;}}
</style>
<div class="page-header">
  <h1 class="page-title">Good morning, ${(user.full_name || 'Student').split(' ')[0]} 👋</h1>
  <p class="page-subtitle">${user.department || 'Not Set'} · ${user.year || 'No Year'} · CGPA: ${user.cgpa || 'N/A'}</p>
</div>

<!-- Welcome banner -->
<div class="welcome-banner animate-fade-in-up">
  <div class="welcome-text">
    <h2>Your placement journey is <span style="background:var(--gradient-brand);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">72% ready</span></h2>
    <p>Complete your profile & update your resume to boost your employability score by +12 points</p>
  </div>
  <div class="welcome-actions">
    <a href="#resume" onclick="window.location.hash='resume'" class="btn btn-primary" style="text-decoration:none;">Update Resume →</a>
    <a href="#drives" onclick="window.location.hash='drives'" class="btn btn-secondary" style="text-decoration:none;">View Drives</a>
  </div>
</div>

<!-- Stats row -->
<div class="dash-grid">
  <div class="stat-card animate-fade-in-up">
    <div class="stat-card-icon" style="background:rgba(124,58,237,.15);">🎯</div>
    <div class="stat-card-value" id="sc-emp">78</div>
    <div class="stat-card-label">Employability Score</div>
    <div class="stat-card-change up">↑ +6 this month</div>
  </div>
  <div class="stat-card animate-fade-in-up delay-100">
    <div class="stat-card-icon" style="background:rgba(34,211,238,.12);">📄</div>
    <div class="stat-card-value" id="sc-ats">82</div>
    <div class="stat-card-label">ATS Resume Score</div>
    <div class="stat-card-change up">↑ +8 after last update</div>
  </div>
  <div class="stat-card animate-fade-in-up delay-200">
    <div class="stat-card-icon" style="background:rgba(16,185,129,.12);">📝</div>
    <div class="stat-card-value">3</div>
    <div class="stat-card-label">Active Applications</div>
    <div class="stat-card-change" style="color:var(--warning);">1 shortlisted</div>
  </div>
  <div class="stat-card animate-fade-in-up delay-300">
    <div class="stat-card-icon" style="background:rgba(245,158,11,.12);">📅</div>
    <div class="stat-card-value">4</div>
    <div class="stat-card-label">Drives Open</div>
    <div class="stat-card-change" style="color:var(--info);">Deadline in 5 days</div>
  </div>
</div>

<!-- Middle row -->
<div class="dash-mid">
  <!-- Left: Skill breakdown + chart -->
  <div class="card animate-fade-in-up">
    <div class="card-header">
      <div>
        <div class="card-title">Employability Breakdown</div>
        <div class="card-subtitle">AI-analyzed skill profile</div>
      </div>
      <a href="#employability" onclick="window.location.hash='employability'" class="btn btn-sm btn-ghost" style="text-decoration:none;">Full Report →</a>
    </div>
    <div style="display:grid;grid-template-columns:1fr 160px;gap:24px;align-items:center;">
      <div id="skill-bars"></div>
      <div style="text-align:center;">
        <canvas id="radar-chart" width="150" height="150"></canvas>
      </div>
    </div>
  </div>
  <!-- Right: Placement probability -->
  <div class="card animate-fade-in-up delay-200">
    <div class="card-header">
      <div class="card-title">Placement Probability</div>
      <span class="badge badge-success badge-dot">High</span>
    </div>
    <div class="prob-ring-wrap">
      <svg width="120" height="120" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="45" fill="none" stroke="rgba(255,255,255,.06)" stroke-width="10" stroke-dasharray="212" stroke-linecap="round"/>
        <circle cx="60" cy="60" r="45" fill="none" stroke="url(#probGrad)" stroke-width="10" stroke-dasharray="212" stroke-dashoffset="59" stroke-linecap="round" id="prob-arc"/>
        <defs><linearGradient id="probGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#7C3AED"/><stop offset="100%" stop-color="#22D3EE"/></linearGradient></defs>
      </svg>
      <div class="prob-ring-label">
        <span style="font-family:var(--font-display);font-size:1.6rem;font-weight:800;color:var(--text-primary);">72%</span>
        <span style="font-size:.65rem;color:var(--text-muted);">probability</span>
      </div>
    </div>
    <p style="text-align:center;font-size:.8rem;color:var(--text-secondary);margin-top:8px;">Based on CGPA, skills, ATS score and market demand</p>
    <div style="margin-top:16px;display:flex;flex-direction:column;gap:8px;">
      <div class="progress-bar-wrapper">
        <div class="progress-bar-label"><span>Profile Completion</span><span>74%</span></div>
        <div class="progress-bar-track"><div class="progress-bar-fill" style="width:74%"></div></div>
      </div>
      <div class="progress-bar-wrapper">
        <div class="progress-bar-label"><span>Skills Match</span><span>68%</span></div>
        <div class="progress-bar-track"><div class="progress-bar-fill" style="width:68%"></div></div>
      </div>
    </div>
  </div>
</div>

<!-- Bottom row -->
<div class="dash-bottom">
  <!-- Applications -->
  <div class="card animate-fade-in-up">
    <div class="card-header">
      <div class="card-title">My Applications</div>
      <a href="#drives" onclick="window.location.hash='drives'" class="btn btn-sm btn-ghost" style="text-decoration:none;">All →</a>
    </div>
    <div id="app-list"></div>
  </div>
  <!-- AI Recommendations -->
  <div class="ai-widget animate-fade-in-up delay-100">
    <div class="ai-widget-header">
      <span class="ai-badge">🤖 AI</span>
      <span class="ai-widget-title">Smart Recommendations</span>
    </div>
    <div id="ai-recs" style="display:flex;flex-direction:column;gap:10px;"></div>
  </div>
  <!-- Upcoming Drives Timeline -->
  <div class="card animate-fade-in-up delay-200">
    <div class="card-header"><div class="card-title">Upcoming Deadlines</div></div>
    <div class="timeline" id="drive-timeline"></div>
  </div>
</div>`;

  // Skill bars
  const skills = p.skills;
  document.getElementById('skill-bars').innerHTML = Object.entries(skills).map(([k, v]) => `
    <div class="skill-bar">
      <div class="skill-bar-row">
        <span class="skill-bar-label">${k.replace(/([A-Z])/g,' $1').trim()}</span>
        <div class="skill-bar-track"><div class="skill-bar-fill" style="width:${v}%"></div></div>
        <span class="skill-bar-pct">${v}%</span>
      </div>
    </div>`).join('');

  // Applications
  document.getElementById('app-list').innerHTML = Store.studentProfile.applications.map(a => `
    <div class="app-row">
      <div><div class="app-company">${a.drive}</div><div class="app-role">${a.role}</div></div>
      <div style="text-align:right;"><span class="badge ${a.status==='Shortlisted'?'badge-success':a.status==='Technical Round'?'badge-warning':'badge-neutral'}">${a.status}</span><div class="app-date">${a.date}</div></div>
    </div>`).join('');

  // AI recs
  document.getElementById('ai-recs').innerHTML = Store.studentProfile.aiRecommendations.slice(0,3).map(r => `
    <div style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:10px;padding:12px;display:flex;gap:10px;align-items:flex-start;">
      <span style="font-size:1.1rem;flex-shrink:0;">${r.icon}</span>
      <div style="flex:1;">
        <div style="font-size:.8rem;font-weight:600;color:var(--text-primary);margin-bottom:2px;">${r.title}</div>
        <div style="font-size:.75rem;color:var(--text-secondary);">${r.desc}</div>
      </div>
    </div>`).join('');

  // Drive timeline
  const openDrives = Store.drives.filter(d => d.status === 'Open').slice(0, 4);
  document.getElementById('drive-timeline').innerHTML = openDrives.map(d => `
    <div class="timeline-item">
      <div class="timeline-left"><div class="timeline-dot"></div><div class="timeline-line"></div></div>
      <div class="timeline-content">
        <div class="timeline-title">${d.company} — ${d.role}</div>
        <div class="timeline-time">Deadline: ${d.deadline} · ${d.package}</div>
      </div>
    </div>`).join('');

  // Radar chart
  setTimeout(() => {
    const ctx = document.getElementById('radar-chart');
    if (!ctx || typeof Chart === 'undefined') return;
    new Chart(ctx, {
      type: 'radar',
      data: {
        labels: ['Technical','Comm.','Problem\nSolving','Domain','Collab.'],
        datasets: [{
          data: Object.values(skills),
          backgroundColor: 'rgba(124,58,237,0.2)',
          borderColor: '#7C3AED',
          pointBackgroundColor: '#22D3EE',
          borderWidth: 2,
        }]
      },
      options: {
        responsive: false,
        scales: {
          r: {
            min: 0, max: 100,
            ticks: { display: false },
            grid: { color: 'rgba(255,255,255,0.06)' },
            pointLabels: { color: '#64748B', font: { size: 9 } }
          }
        },
        plugins: { legend: { display: false } }
      }
    });
  }, 100);
}
