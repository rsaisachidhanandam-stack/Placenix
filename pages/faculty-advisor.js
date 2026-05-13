import { supabase } from '../supabase.js';

export async function loadFacultyAdvisorPage(root, Store) {
  let state = {
    activeTab: 'dashboard',
    searchQuery: '',
    filterDept: 'All',
    students: [
      { id: 1, name: 'Aditya Kumar', regNo: '2021CSE001', dept: 'CSE', cgpa: 9.2, resumeScore: 88, empScore: 85, prob: 'High', status: 'Approved', readiness: 90 },
      { id: 2, name: 'Sanjana Rao', regNo: '2021ECE042', dept: 'ECE', cgpa: 8.5, resumeScore: 72, empScore: 65, prob: 'Medium', status: 'Pending', readiness: 60 },
      { id: 3, name: 'Rahul Varma', regNo: '2021CSE088', dept: 'CSE', cgpa: 7.2, resumeScore: 45, empScore: 40, prob: 'Low', status: 'Rejected', readiness: 30 },
      { id: 4, name: 'Priya Dharshini', regNo: '2021IT015', dept: 'IT', cgpa: 8.9, resumeScore: 95, empScore: 92, prob: 'High', status: 'Approved', readiness: 95 },
      { id: 5, name: 'Vikram Singh', regNo: '2021MECH010', dept: 'MECH', cgpa: 7.8, resumeScore: 60, empScore: 55, prob: 'Medium', status: 'Under Review', readiness: 50 },
    ]
  };

  const render = () => {
    root.innerHTML = `
    <style>
      .fa-container { padding: 32px; color: var(--text-main); animation: fadeIn 0.5s ease; }
      .fa-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 40px; }
      
      .fa-stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; margin-bottom: 40px; }
      .fa-stat-card { background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 20px; padding: 24px; position: relative; overflow: hidden; }
      .fa-stat-card::after { content: ''; position: absolute; bottom: 0; left: 0; width: 100%; height: 4px; background: var(--brand-electric-violet); opacity: 0.3; }
      .fa-stat-value { font-size: 2rem; font-weight: 800; margin: 8px 0; }
      .fa-stat-label { font-size: 0.85rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
      
      .fa-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 32px; }
      .fa-section-card { background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 24px; padding: 24px; }
      
      .fa-tabs { display: flex; gap: 12px; margin-bottom: 32px; background: rgba(0,0,0,0.2); padding: 6px; border-radius: 12px; width: fit-content; }
      .fa-tab { padding: 10px 24px; cursor: pointer; border-radius: 8px; font-weight: 700; font-size: 0.9rem; color: var(--text-muted); transition: all 0.3s; }
      .fa-tab.active { background: var(--brand-electric-violet); color: white; box-shadow: 0 4px 12px rgba(124,58,237,0.3); }
      
      .fa-table { width: 100%; border-collapse: separate; border-spacing: 0 8px; }
      .fa-table th { padding: 12px 16px; color: var(--text-muted); font-weight: 600; font-size: 0.75rem; text-transform: uppercase; text-align: left; }
      .fa-table tr { transition: transform 0.2s; }
      .fa-table td { background: rgba(255,255,255,0.02); padding: 16px; border-top: 1px solid var(--border-subtle); border-bottom: 1px solid var(--border-subtle); }
      .fa-table td:first-child { border-left: 1px solid var(--border-subtle); border-top-left-radius: 12px; border-bottom-left-radius: 12px; }
      .fa-table td:last-child { border-right: 1px solid var(--border-subtle); border-top-right-radius: 12px; border-bottom-right-radius: 12px; }
      .fa-table tr:hover td { background: rgba(255,255,255,0.04); }
      
      .readiness-meter { width: 100%; height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden; margin-top: 6px; }
      .readiness-fill { height: 100%; transition: width 1s ease; }
      
      .ai-insight-box { background: linear-gradient(135deg, rgba(124,58,237,0.1), rgba(79,70,229,0.1)); border: 1px solid rgba(124,58,237,0.2); border-radius: 20px; padding: 24px; }
      .insight-item { display: flex; gap: 16px; margin-bottom: 20px; }
      .insight-icon { width: 40px; height: 40px; border-radius: 12px; background: rgba(124,58,237,0.2); display: flex; align-items: center; justify-content: center; font-size: 1.2rem; }
      
      @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    </style>

    <div class="fa-container">
      <div class="fa-header">
        <div>
          <div style="display:flex; align-items:center; gap:12px; margin-bottom:8px;">
            <span style="background:var(--brand-electric-violet); color:white; padding:4px 10px; border-radius:6px; font-size:0.7rem; font-weight:800;">FACULTY ADVISOR</span>
            <span style="color:var(--text-muted); font-size:0.8rem;">Batch of 2025 · CSE Section A</span>
          </div>
          <h1 style="font-size: 2.2rem; font-weight: 900; letter-spacing: -0.02em;">Mentoring Dashboard</h1>
        </div>
        <div style="display:flex; gap:12px;">
          <button class="btn btn-secondary"><span style="margin-right:8px;">📊</span> Export Analytics</button>
          <button class="btn btn-primary"><span style="margin-right:8px;">📢</span> Global Announcement</button>
        </div>
      </div>

      <div class="fa-stats-grid">
        <div class="fa-stat-card">
          <div class="fa-stat-label">Assigned Students</div>
          <div class="fa-stat-value">24</div>
          <div style="color:#22c55e; font-size:0.75rem; font-weight:700;">● 100% Onboarded</div>
        </div>
        <div class="fa-stat-card" style="border-bottom: 4px solid #22c55e;">
          <div class="fa-stat-label">Placement Ready</div>
          <div class="fa-stat-value" style="color:#22c55e;">18</div>
          <div style="color:var(--text-muted); font-size:0.75rem;">↑ 2 since last week</div>
        </div>
        <div class="fa-stat-card" style="border-bottom: 4px solid #f59e0b;">
          <div class="fa-stat-label">Pending Validation</div>
          <div class="fa-stat-value" style="color:#f59e0b;">05</div>
          <div style="color:#f59e0b; font-size:0.75rem; font-weight:700;">⚡ High Priority</div>
        </div>
        <div class="fa-stat-card" style="border-bottom: 4px solid #ef4444;">
          <div class="fa-stat-label">Placement Risk</div>
          <div class="fa-stat-value" style="color:#ef4444;">03</div>
          <div style="color:#ef4444; font-size:0.75rem; font-weight:700;">⚠️ Intervention Needed</div>
        </div>
      </div>

      <div class="fa-tabs">
        <div class="fa-tab ${state.activeTab === 'dashboard' ? 'active' : ''}" data-tab="dashboard">Overview</div>
        <div class="fa-tab ${state.activeTab === 'students' ? 'active' : ''}" data-tab="students">Student Roster</div>
        <div class="fa-tab ${state.activeTab === 'validation' ? 'active' : ''}" data-tab="validation">Profile Validation</div>
        <div class="fa-tab ${state.activeTab === 'mentoring' ? 'active' : ''}" data-tab="mentoring">AI Mentoring</div>
      </div>

      <div id="fa-content">
        ${renderContent()}
      </div>
    </div>
    `;

    document.querySelectorAll('.fa-tab').forEach(tab => {
      tab.onclick = () => {
        state.activeTab = tab.dataset.tab;
        render();
      };
    });
  };

  function renderContent() {
    switch (state.activeTab) {
      case 'dashboard': return renderDashboard();
      case 'students': return renderStudents();
      case 'validation': return renderValidation();
      case 'mentoring': return renderMentoring();
      default: return renderDashboard();
    }
  }

  function renderDashboard() {
    return `
    <div class="fa-grid">
      <div style="display:flex; flex-direction:column; gap:32px;">
        <div class="fa-section-card">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
            <h3 style="font-size:1.1rem; font-weight:800;">Employability Trend</h3>
            <select class="btn btn-secondary btn-sm" style="background:transparent; border:none;">
              <option>Last 6 Months</option>
            </select>
          </div>
          <div style="height:280px; display:flex; align-items:flex-end; gap:20px; padding:20px 0;">
            ${[40,65,55,80,95,88].map((h, i) => `
              <div style="flex:1; display:flex; flex-direction:column; align-items:center; gap:12px;">
                <div style="width:100%; height:${h}%; background:linear-gradient(to top, var(--brand-electric-violet), #4f46e5); border-radius:8px; opacity:${0.5 + (i*0.1)}; position:relative; cursor:pointer;">
                  <div style="position:absolute; top:-25px; left:50%; transform:translateX(-50%); font-size:0.7rem; font-weight:800;">${h}%</div>
                </div>
                <div style="font-size:0.7rem; font-weight:700; color:var(--text-muted);">${['Jan','Feb','Mar','Apr','May','Jun'][i]}</div>
              </div>
            `).join('')}
          </div>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:24px;">
          <div class="fa-section-card">
            <h3 style="font-size:1rem; font-weight:800; margin-bottom:20px;">Skill Distribution</h3>
            <div style="display:flex; flex-direction:column; gap:16px;">
              ${[['Coding', 85, '#7c3aed'], ['Aptitude', 72, '#3b82f6'], ['Soft Skills', 90, '#22c55e'], ['Technical', 65, '#f59e0b']].map(([lbl, val, clr]) => `
                <div>
                  <div style="display:flex; justify-content:space-between; font-size:0.8rem; margin-bottom:6px;">
                    <span style="font-weight:700;">${lbl}</span>
                    <span style="color:var(--text-muted);">${val}%</span>
                  </div>
                  <div class="readiness-meter"><div class="readiness-fill" style="width:${val}%; background:${clr};"></div></div>
                </div>
              `).join('')}
            </div>
          </div>
          <div class="fa-section-card">
            <h3 style="font-size:1rem; font-weight:800; margin-bottom:20px;">Resume Quality Index</h3>
            <div style="height:180px; display:flex; align-items:center; justify-content:center; position:relative;">
              <div style="width:140px; height:140px; border-radius:50%; border:12px solid rgba(255,255,255,0.05); display:flex; align-items:center; justify-content:center; flex-direction:column;">
                <div style="font-size:1.8rem; font-weight:900;">82%</div>
                <div style="font-size:0.6rem; font-weight:700; color:var(--text-muted);">AVG SCORE</div>
              </div>
              <svg style="position:absolute; width:140px; height:140px; transform:rotate(-90deg);">
                <circle cx="70" cy="70" r="64" fill="none" stroke="var(--brand-electric-violet)" stroke-width="12" stroke-dasharray="402" stroke-dashoffset="72" stroke-linecap="round" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div style="display:flex; flex-direction:column; gap:24px;">
        <div class="ai-insight-box">
          <div style="display:flex; align-items:center; gap:10px; margin-bottom:24px;">
            <div style="font-size:1.5rem;">🤖</div>
            <h3 style="font-size:1.1rem; font-weight:900;">AI Advisor</h3>
          </div>
          
          <div class="insight-item">
            <div class="insight-icon">⚠️</div>
            <div>
              <div style="font-size:0.85rem; font-weight:800;">Critical Risk Alert</div>
              <p style="font-size:0.75rem; color:var(--text-muted); margin-top:4px;">Rahul Varma's CGPA and technical scores are mismatched. High placement risk detected.</p>
              <button class="btn btn-ghost btn-sm" style="margin-top:8px; padding:0; color:var(--brand-electric-violet);">View Analysis →</button>
            </div>
          </div>

          <div class="insight-item">
            <div class="insight-icon">💡</div>
            <div>
              <div style="font-size:0.85rem; font-weight:800;">Communication Gap</div>
              <p style="font-size:0.75rem; color:var(--text-muted); margin-top:4px;">5 students in the 8-9 CGPA bracket show low Soft Skill readiness. Suggesting Workshop #4.</p>
            </div>
          </div>

          <button class="btn btn-primary" style="width:100%; border-radius:12px;">Review All AI Insights</button>
        </div>

        <div class="fa-section-card">
          <h3 style="font-size:1rem; font-weight:800; margin-bottom:16px;">Mentoring Queue</h3>
          <div style="display:flex; flex-direction:column; gap:12px;">
            ${['Rahul Varma', 'Sanjana Rao', 'Vikram Singh'].map((name, i) => `
              <div style="display:flex; align-items:center; gap:12px; padding:12px; background:rgba(255,255,255,0.03); border-radius:12px;">
                <div style="width:32px; height:32px; border-radius:50%; background:var(--brand-electric-violet); display:flex; align-items:center; justify-content:center; font-size:0.7rem; font-weight:800;">${name[0]}</div>
                <div style="flex:1;">
                  <div style="font-size:0.8rem; font-weight:700;">${name}</div>
                  <div style="font-size:0.65rem; color:var(--text-muted);">${['Resume Revamp', 'Technical Prep', 'Mock Interview'][i]}</div>
                </div>
                <button class="btn-icon">📅</button>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
    `;
  }

  function renderStudents() {
    return `
    <div class="card">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
        <div style="display:flex; gap:10px;">
          <input type="text" placeholder="Search by name or register number..." style="padding:10px 16px; border-radius:8px; background:rgba(0,0,0,0.2); border:1px solid var(--border-subtle); width:300px; color:white;">
          <select style="padding:10px; border-radius:8px; background:rgba(0,0,0,0.2); border:1px solid var(--border-subtle); color:white;">
            <option>All Departments</option>
            <option>CSE</option>
            <option>ECE</option>
            <option>IT</option>
          </select>
        </div>
        <button class="btn btn-secondary btn-sm">Filter Options</button>
      </div>

      <div class="table-wrapper">
        <table class="fa-table">
          <thead>
            <tr>
              <th>Student Name</th>
              <th>CGPA</th>
              <th>Resume</th>
              <th>Employability</th>
              <th>Prob.</th>
              <th>Readiness</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${state.students.map(s => `
              <tr>
                <td>
                  <div style="font-weight:700;">${s.name}</div>
                  <div style="font-size:0.7rem; color:var(--text-muted);">${s.regNo} · ${s.dept}</div>
                </td>
                <td>${s.cgpa}</td>
                <td>
                  <div style="font-weight:700;">${s.resumeScore}</div>
                  <div style="width:60px; height:4px; background:rgba(255,255,255,0.1); border-radius:2px; margin-top:4px;">
                    <div style="width:${s.resumeScore}%; height:100%; background:var(--brand-electric-violet); border-radius:2px;"></div>
                  </div>
                </td>
                <td>${s.empScore}</td>
                <td><span class="badge ${s.prob === 'High' ? 'badge-success' : s.prob === 'Medium' ? 'badge-warning' : 'badge-danger'}">${s.prob}</span></td>
                <td>${s.readiness}%</td>
                <td><span class="badge ${s.status === 'Approved' ? 'badge-success' : s.status === 'Rejected' ? 'badge-danger' : 'badge-warning'}">${s.status}</span></td>
                <td>
                  <button class="btn btn-sm btn-ghost" style="padding:4px 8px;">View</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
    `;
  }

  function renderValidation() {
    return `
    <div style="display: grid; grid-template-columns: 1.5fr 1fr; gap: 24px;">
      <div class="card">
        <div class="card-header"><h3 class="card-title">Pending Approvals</h3></div>
        <div style="display:flex; flex-direction:column; gap:16px; padding-top:16px;">
          ${state.students.filter(s => s.status === 'Pending' || s.status === 'Under Review').map(s => `
            <div style="background:rgba(255,255,255,0.02); border:1px solid var(--border-subtle); border-radius:12px; padding:16px; display:flex; justify-content:space-between; align-items:center;">
              <div>
                <div style="font-weight:700;">${s.name}</div>
                <div style="font-size:0.75rem; color:var(--text-muted);">${s.dept} · Profile Validation Request</div>
              </div>
              <div style="display:flex; gap:8px;">
                <button class="btn btn-sm btn-secondary">Review</button>
                <button class="btn btn-sm btn-primary">Quick Approve</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      
      <div class="card">
        <div class="card-header"><h3 class="card-title">Validation Insights</h3></div>
        <div style="display:flex; flex-direction:column; gap:12px; padding-top:16px;">
          <div class="ai-insight-card fa-card" style="padding:12px;">
            <div style="font-size:0.8rem;"><strong>Missing Documents:</strong> 3 students have not uploaded internship certificates.</div>
          </div>
          <div class="ai-insight-card fa-card" style="padding:12px; border-color: rgba(239,68,68,0.2);">
            <div style="font-size:0.8rem;"><strong>Duplicate Detection:</strong> 1 possible duplicate certificate flagged for Rahul Varma.</div>
          </div>
        </div>
      </div>
    </div>
    `;
  }

  function renderMentoring() {
    return `
    <div class="card">
      <div class="card-header"><h3 class="card-title">AI Mentoring Overview</h3></div>
      <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:20px; padding-top:16px;">
        <div class="fa-card">
          <div style="font-size:0.8rem; color:var(--text-muted); margin-bottom:8px;">Weak Communication</div>
          <div style="font-size:1.5rem; font-weight:800; color:#f59e0b;">12 Students</div>
          <button class="btn btn-ghost btn-sm" style="margin-top:10px; width:100%;">View List</button>
        </div>
        <div class="fa-card">
          <div style="font-size:0.8rem; color:var(--text-muted); margin-bottom:8px;">Coding Gaps</div>
          <div style="font-size:1.5rem; font-weight:800; color:#ef4444;">8 Students</div>
          <button class="btn btn-ghost btn-sm" style="margin-top:10px; width:100%;">View List</button>
        </div>
        <div class="fa-card">
          <div style="font-size:0.8rem; color:var(--text-muted); margin-bottom:8px;">Low Confidence</div>
          <div style="font-size:1.5rem; font-weight:800; color:#3b82f6;">15 Students</div>
          <button class="btn btn-ghost btn-sm" style="margin-top:10px; width:100%;">View List</button>
        </div>
      </div>
      
      <div style="margin-top:24px;">
        <h4 style="margin-bottom:12px;">Recommended Actions</h4>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
          <div style="padding:16px; border:1px solid var(--border-subtle); border-radius:12px; background:rgba(124,58,237,0.05);">
            <div style="font-weight:700; margin-bottom:4px;">Schedule Mock Interview Batch</div>
            <p style="font-size:0.8rem; color:var(--text-muted);">8 students are ready for their technical round with Zoho.</p>
            <button class="btn btn-primary btn-sm" style="margin-top:8px;">Auto-Schedule →</button>
          </div>
          <div style="padding:16px; border:1px solid var(--border-subtle); border-radius:12px; background:rgba(59,130,246,0.05);">
            <div style="font-weight:700; margin-bottom:4px;">Share DSA Prep Material</div>
            <p style="font-size:0.8rem; color:var(--text-muted);">Improve coding readiness for CSE batch.</p>
            <button class="btn btn-secondary btn-sm" style="margin-top:8px;">Share to Group →</button>
          </div>
        </div>
      </div>
    </div>
    `;
  }

  render();
}
