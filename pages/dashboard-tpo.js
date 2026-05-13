export async function loadTPODash(root, Store) {
  const a = Store.analytics.overall;
  root.innerHTML = `
<style>
.tpo-kpi{display:grid;grid-template-columns:repeat(4,1fr);gap:18px;margin-bottom:24px;}
.tpo-mid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px;}
.tpo-bottom{display:grid;grid-template-columns:2fr 1fr;gap:20px;}
</style>
<div class="page-header">
  <div style="display:flex;justify-content:space-between;align-items:center;">
    <div><h1 class="page-title">TPO Operations Dashboard</h1><p class="page-subtitle">Sri Venkateswara College of Engineering · 2024-25 Placement Season</p></div>
    <div style="display:flex;gap:10px;">
      <button class="btn btn-secondary btn-sm">📥 Export Report</button>
      <a href="#drives" onclick="window.location.hash='drives'" class="btn btn-primary btn-sm" style="text-decoration:none;">+ Create Drive</a>
    </div>
  </div>
</div>

<div class="tpo-kpi">
  ${[
    ['🎓',a.placementPercent+'%','Placement Rate','↑ +11% vs last year','success','rgba(124,58,237,.15)'],
    ['💰',a.avgPackage,'Avg. Package','↑ +1.2 LPA improvement','success','rgba(34,211,238,.12)'],
    [' 🏆',a.highestPackage,'Highest Package','Microsoft · Sneha Nair','info','rgba(16,185,129,.12)'],
    ['🤝',a.activeRecruiters,'Active Recruiters','↑ +8 new this season','success','rgba(245,158,11,.12)'],
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
              <td><div class="table-avatar"><div class="table-avatar-img">${d.logo}</div><strong>${d.company}</strong></div></td>
              <td>${d.role}</td>
              <td><span class="badge badge-${d.status==='Open'?'success':d.status==='Upcoming'?'info':'neutral'} badge-dot">${d.status}</span></td>
              <td>${d.applicants}</td>
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
        <div style="font-size:.8rem;color:var(--text-secondary);">💡 <strong>14 students</strong> eligible for Zoho haven't applied yet. Send reminder?</div>
        <div style="font-size:.8rem;color:var(--text-secondary);">📈 CSE dept is trending <strong>+18%</strong> above last year's placement rate.</div>
        <div style="font-size:.8rem;color:var(--text-secondary);">⚠️ <strong>3 students</strong> have CGPA borderline for TCS Digital. Consider appeal process.</div>
        <button class="btn btn-primary btn-sm" style="margin-top:8px;" onclick="alert('Reminder sent to 14 students!')">Send Drive Reminders →</button>
      </div>
    </div>
    <div class="card animate-fade-in-up delay-200">
      <div class="card-title" style="margin-bottom:12px;">Quick Actions</div>
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${[['🎯','Create New Drive','drives'],['🔀','View Pipeline','kanban']].map(([ic,lbl,rt])=>`
          <a href="#${rt}" onclick="window.location.hash='${rt}'" class="btn btn-secondary" style="justify-content:flex-start;text-decoration:none;">${ic} ${lbl}</a>`).join('')}
      </div>
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
          data: depts.map(d=>Math.round((d.placed/d.total)*100)),
          backgroundColor: ['rgba(124,58,237,.7)','rgba(34,211,238,.7)','rgba(16,185,129,.7)','rgba(245,158,11,.7)','rgba(239,68,68,.7)','rgba(59,130,246,.7)'],
          borderRadius: 6,
        }]
      },
      options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { max: 100, grid: { color: 'rgba(255,255,255,.05)' }, ticks: { color: '#64748B', callback: v => v+'%' } }, x: { grid: { display: false }, ticks: { color: '#64748B' } } } }
    });
  }, 100);
}

export async function loadAdminDash(root, Store) {
  root.innerHTML = `
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
      <thead><tr><th>Student</th><th>Dept</th><th>CGPA</th><th>ATS Score</th><th>Emp. Score</th><th>Status</th><th>Company</th></tr></thead>
      <tbody>
        ${Store.students.map(s=>`
          <tr>
            <td><div class="table-avatar"><div class="table-avatar-img">${s.avatar}</div>${s.name}</div></td>
            <td><span class="badge badge-neutral">${s.dept}</span></td>
            <td><strong>${s.cgpa}</strong></td>
            <td><span style="color:${s.atsScore>=80?'var(--success)':s.atsScore>=65?'var(--warning)':'var(--danger)'};">${s.atsScore}</span></td>
            <td><span style="color:${s.empScore>=80?'var(--success)':s.empScore>=65?'var(--warning)':'var(--danger)'};">${s.empScore}</span></td>
            <td><span class="badge badge-${s.status==='Placed'?'success':s.status==='Shortlisted'?'warning':'neutral'} badge-dot">${s.status}</span></td>
            <td style="color:var(--brand-cyan)">${s.company||'—'}</td>
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
