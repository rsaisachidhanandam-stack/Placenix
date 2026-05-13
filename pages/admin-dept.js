import { supabase } from '../supabase.js';

export async function loadAdminDeptPage(root, Store) {
  let state = {
    activeTab: 'dashboard',
    facultyRequests: [
      { id: 1, name: 'Dr. Sarah Wilson', facultyId: 'FA101', email: 'sarah.w@svce.edu', dept: 'CSE', designation: 'Asst. Professor', date: '2026-05-10', status: 'Pending' },
      { id: 2, name: 'Prof. Michael Chen', facultyId: 'FA102', email: 'm.chen@svce.edu', dept: 'ECE', designation: 'Professor', date: '2026-05-09', status: 'Pending' },
      { id: 3, name: 'Arjun Mehta', facultyId: 'FA103', email: 'arjun.m@svce.edu', dept: 'IT', designation: 'Lecturer', date: '2026-05-08', status: 'Approved' }
    ],
    students: [
      { id: 1, name: 'Aditya Kumar', regNo: '2021CSE001', dept: 'CSE', batch: '2025', faculty: 'None', status: 'Unassigned' },
      { id: 2, name: 'Sanjana Rao', regNo: '2021ECE042', dept: 'ECE', batch: '2025', faculty: 'Prof. Michael Chen', status: 'Assigned' },
      { id: 3, name: 'Rahul Varma', regNo: '2021CSE088', dept: 'CSE', batch: '2025', faculty: 'None', status: 'Unassigned' },
    ],
    facultyList: [
      { id: 1, name: 'Arjun Mehta', dept: 'IT', batch: '2025', totalStudents: 15, status: 'Active', access: 'Active' },
      { id: 2, name: 'Dr. Sarah Wilson', dept: 'CSE', batch: 'None', totalStudents: 0, status: 'Pending', access: 'Inactive' }
    ]
  };

  const render = () => {
    root.innerHTML = `
    <style>
      :root {
        --admin-bg: #030712;
        --admin-card: rgba(17, 24, 39, 0.7);
        --admin-accent: #7c3aed;
        --admin-accent-glow: rgba(124, 58, 237, 0.4);
        --admin-border: rgba(255, 255, 255, 0.08);
      }

      .admin-container { 
        padding: 40px; 
        color: #f3f4f6; 
        background: var(--admin-bg); 
        min-height: 100vh;
        font-family: 'Inter', sans-serif;
        animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1);
      }

      .admin-header { 
        display: flex; 
        justify-content: space-between; 
        align-items: flex-start; 
        margin-bottom: 48px; 
      }

      .admin-title-area h1 {
        font-size: 2.5rem;
        font-weight: 800;
        letter-spacing: -0.03em;
        background: linear-gradient(to right, #fff, #9ca3af);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        margin-bottom: 8px;
      }

      .badge-premium {
        background: linear-gradient(90deg, var(--admin-accent), #db2777);
        color: white;
        padding: 4px 12px;
        border-radius: 6px;
        font-size: 0.7rem;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        box-shadow: 0 0 20px var(--admin-accent-glow);
      }

      .admin-stats-grid { 
        display: grid; 
        grid-template-columns: repeat(5, 1fr); 
        gap: 24px; 
        margin-bottom: 48px; 
      }

      .admin-stat-card { 
        background: var(--admin-card);
        backdrop-filter: blur(12px);
        border: 1px solid var(--admin-border);
        border-radius: 24px; 
        padding: 28px; 
        position: relative;
        transition: all 0.3s ease;
        box-shadow: 0 4px 20px rgba(0,0,0,0.2);
      }

      .admin-stat-card:hover { 
        transform: translateY(-5px); 
        border-color: var(--admin-accent);
        box-shadow: 0 10px 30px rgba(0,0,0,0.4);
      }

      .admin-stat-value { 
        font-size: 2.2rem; 
        font-weight: 800; 
        margin: 12px 0 4px;
        font-family: 'Space Grotesk', sans-serif;
      }

      .admin-stat-label { 
        font-size: 0.75rem; 
        color: #9ca3af; 
        font-weight: 700; 
        text-transform: uppercase; 
        letter-spacing: 0.1em; 
      }

      .admin-tabs { 
        display: flex; 
        gap: 12px; 
        margin-bottom: 40px; 
        padding: 8px; 
        background: rgba(255,255,255,0.03); 
        border-radius: 16px; 
        width: fit-content; 
        border: 1px solid var(--admin-border);
      }

      .admin-tab { 
        padding: 12px 24px; 
        cursor: pointer; 
        border-radius: 12px; 
        font-weight: 600; 
        font-size: 0.9rem; 
        color: #9ca3af; 
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .admin-tab:hover {
        color: white;
        background: rgba(255,255,255,0.05);
      }

      .admin-tab.active { 
        background: var(--admin-accent); 
        color: white; 
        box-shadow: 0 0 20px var(--admin-accent-glow);
      }

      .glass-card { 
        background: var(--admin-card);
        backdrop-filter: blur(16px);
        border: 1px solid var(--admin-border);
        border-radius: 32px; 
        padding: 32px; 
        box-shadow: 0 20px 50px rgba(0,0,0,0.3);
      }

      .premium-table { 
        width: 100%; 
        border-collapse: separate; 
        border-spacing: 0 12px; 
      }

      .premium-table th { 
        padding: 0 20px 10px; 
        color: #6b7280; 
        font-weight: 700; 
        font-size: 0.75rem; 
        text-transform: uppercase; 
        text-align: left; 
        letter-spacing: 0.05em;
      }

      .premium-table tr {
        transition: transform 0.2s ease;
      }

      .premium-table td { 
        background: rgba(255,255,255,0.02); 
        padding: 20px; 
        border-top: 1px solid var(--admin-border);
        border-bottom: 1px solid var(--admin-border);
        font-size: 0.95rem;
      }

      .premium-table td:first-child { 
        border-left: 1px solid var(--admin-border); 
        border-top-left-radius: 16px; 
        border-bottom-left-radius: 16px; 
      }

      .premium-table td:last-child { 
        border-right: 1px solid var(--admin-border); 
        border-top-right-radius: 16px; 
        border-bottom-right-radius: 16px; 
      }

      .premium-table tr:hover td {
        background: rgba(255,255,255,0.04);
        border-color: rgba(124, 58, 237, 0.3);
      }

      .status-pill { 
        padding: 6px 14px; 
        border-radius: 99px; 
        font-size: 0.7rem; 
        font-weight: 800; 
        text-transform: uppercase; 
        letter-spacing: 0.05em;
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }

      .status-pending { background: rgba(245,158,11,0.1); color: #fbbf24; border: 1px solid rgba(245,158,11,0.2); }
      .status-approved { background: rgba(16,185,129,0.1); color: #10b981; border: 1px solid rgba(16,185,129,0.2); }
      .status-rejected { background: rgba(239,68,68,0.1); color: #ef4444; border: 1px solid rgba(239,68,68,0.2); }

      .btn-action {
        padding: 10px 20px;
        border-radius: 12px;
        font-weight: 700;
        font-size: 0.8rem;
        cursor: pointer;
        transition: all 0.2s;
        border: 1px solid transparent;
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }

      .btn-approve {
        background: var(--admin-accent);
        color: white;
        box-shadow: 0 4px 15px var(--admin-accent-glow);
      }

      .btn-approve:hover {
        transform: scale(1.02);
        box-shadow: 0 6px 20px var(--admin-accent-glow);
      }

      .btn-reject {
        background: rgba(239, 68, 68, 0.1);
        color: #ef4444;
        border-color: rgba(239, 68, 68, 0.2);
      }

      .btn-reject:hover {
        background: #ef4444;
        color: white;
      }

      .mapping-wizard-grid { 
        display: grid; 
        grid-template-columns: 1fr 1.2fr; 
        gap: 32px; 
      }

      .faculty-selector {
        max-height: 500px;
        overflow-y: auto;
        padding-right: 12px;
      }

      .faculty-selector::-webkit-scrollbar { width: 4px; }
      .faculty-selector::-webkit-scrollbar-thumb { background: var(--admin-border); border-radius: 10px; }

      .mapping-item { 
        padding: 20px; 
        background: rgba(255,255,255,0.02); 
        border: 1px solid var(--admin-border); 
        border-radius: 20px; 
        margin-bottom: 16px; 
        cursor: pointer; 
        transition: all 0.3s; 
      }

      .mapping-item.selected {
        border-color: var(--admin-accent);
        background: rgba(124, 58, 237, 0.08);
        box-shadow: inset 0 0 20px rgba(124, 58, 237, 0.1);
      }

      .progress-bar-premium {
        height: 8px;
        background: rgba(255,255,255,0.05);
        border-radius: 4px;
        overflow: hidden;
        margin-top: 10px;
      }

      .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, var(--admin-accent), #3b82f6);
        box-shadow: 0 0 15px var(--admin-accent-glow);
      }

      @keyframes fadeIn { 
        from { opacity: 0; transform: translateY(20px); } 
        to { opacity: 1; transform: translateY(0); } 
      }
    </style>

    <div class="admin-container">
      <div class="admin-header">
        <div class="admin-title-area">
          <div style="display:flex; align-items:center; gap:12px; margin-bottom:12px;">
            <span class="badge-premium">Institution Control Center</span>
            <span style="color:#6b7280; font-size:0.85rem; font-weight:600;">v2.4.0</span>
          </div>
          <h1>Faculty & Assignment Control</h1>
          <p style="color:#9ca3af; font-size:1rem;">Orchestrate mentorship clusters and academic mappings</p>
        </div>
        <div style="display:flex; gap:16px;">
          <div class="glass-card" style="padding:12px 20px; display:flex; align-items:center; gap:16px;">
             <div style="text-align:right;">
                <div style="font-weight:700; font-size:0.9rem;">University Admin</div>
                <div style="font-size:0.75rem; color:#6b7280;">Super User</div>
             </div>
             <div style="width:40px; height:40px; background:var(--admin-accent); border-radius:12px; display:flex; align-items:center; justify-content:center; font-weight:900;">UA</div>
          </div>
        </div>
      </div>

      <div class="admin-stats-grid">
        <div class="admin-stat-card">
          <div class="admin-stat-label">Verified Faculty</div>
          <div class="admin-stat-value">12</div>
          <div style="display:flex; align-items:center; gap:6px; font-size:0.7rem; color:#10b981;">
            <span>●</span> Active Mappings
          </div>
        </div>
        <div class="admin-stat-card">
          <div class="admin-stat-label">Pending Reviews</div>
          <div class="admin-stat-value" style="color:#fbbf24;">05</div>
          <div style="display:flex; align-items:center; gap:6px; font-size:0.7rem; color:#fbbf24;">
            <span>●</span> Needs Approval
          </div>
        </div>
        <div class="admin-stat-card">
          <div class="admin-stat-label">Department Clusters</div>
          <div class="admin-stat-value">08</div>
          <div style="font-size:0.7rem; color:#9ca3af;">Fully Synchronized</div>
        </div>
        <div class="admin-stat-card">
          <div class="admin-stat-label">Linked Students</div>
          <div class="admin-stat-value">480</div>
          <div class="progress-bar-premium"><div class="progress-fill" style="width:85%"></div></div>
        </div>
        <div class="admin-stat-card">
          <div class="admin-stat-label">Orphan Students</div>
          <div class="admin-stat-value" style="color:#ef4444;">42</div>
          <div style="font-size:0.7rem; color:#ef4444; font-weight:700;">Critical Linkage Req.</div>
        </div>
      </div>

      <div class="admin-tabs">
        <div class="admin-tab ${state.activeTab === 'dashboard' ? 'active' : ''}" data-tab="dashboard">Analytics Hub</div>
        <div class="admin-tab ${state.activeTab === 'requests' ? 'active' : ''}" data-tab="requests">Verification Queue</div>
        <div class="admin-tab ${state.activeTab === 'mapping' ? 'active' : ''}" data-tab="mapping">Mapping Wizard</div>
        <div class="admin-tab ${state.activeTab === 'assignment' ? 'active' : ''}" data-tab="assignment">Student Linkage</div>
        <div class="admin-tab ${state.activeTab === 'management' ? 'active' : ''}" data-tab="management">Advisor Registry</div>
      </div>

      <div id="admin-content">
        ${renderContent()}
      </div>
    </div>
    `;

    document.querySelectorAll('.admin-tab').forEach(tab => {
      tab.onclick = () => {
        state.activeTab = tab.dataset.tab;
        render();
      };
    });

    // Action listeners
    document.querySelectorAll('.btn-approve-action').forEach(btn => {
      btn.onclick = () => {
        const id = parseInt(btn.dataset.id);
        const req = state.facultyRequests.find(r => r.id === id);
        if (req) {
          req.status = 'Approved';
          state.facultyList.push({ id: state.facultyList.length + 1, name: req.name, dept: req.dept, batch: 'None', totalStudents: 0, status: 'Active', access: 'Inactive' });
          render();
        }
      };
    });

    document.querySelectorAll('.btn-activate-action').forEach(btn => {
      btn.onclick = () => {
        const id = parseInt(btn.dataset.id);
        const f = state.facultyList.find(x => x.id === id);
        if (f) { f.access = 'Active'; render(); }
      };
    });
  };

  function renderContent() {
    switch (state.activeTab) {
      case 'dashboard': return renderDashboard();
      case 'requests': return renderRequests();
      case 'mapping': return renderMapping();
      case 'assignment': return renderAssignment();
      case 'management': return renderManagement();
      default: return renderDashboard();
    }
  }

  function renderDashboard() {
    return `
    <div style="display:grid; grid-template-columns: 2fr 1fr; gap:32px;">
      <div style="display:flex; flex-direction:column; gap:32px;">
        <div class="glass-card">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:32px;">
            <h3 style="font-size:1.25rem; font-weight:800; letter-spacing:-0.02em;">Faculty Onboarding Priority</h3>
            <button class="btn btn-ghost" style="color:var(--admin-accent);" onclick="document.querySelector('[data-tab=requests]').click()">Process Queue →</button>
          </div>
          <div style="display:flex; flex-direction:column; gap:16px;">
            ${state.facultyRequests.filter(r => r.status === 'Pending').map(r => `
              <div style="display:flex; justify-content:space-between; align-items:center; padding:24px; background:rgba(255,255,255,0.015); border:1px solid var(--admin-border); border-radius:24px;">
                <div style="display:flex; gap:20px; align-items:center;">
                  <div style="width:52px; height:52px; border-radius:16px; background:linear-gradient(135deg, var(--admin-accent), #3b82f6); display:flex; align-items:center; justify-content:center; font-weight:900; font-size:1.1rem; color:white; box-shadow:0 0 15px var(--admin-accent-glow);">${r.name[0]}</div>
                  <div>
                    <div style="font-weight:700; font-size:1.05rem;">${r.name}</div>
                    <div style="font-size:0.8rem; color:#9ca3af; margin-top:4px;">${r.dept} Cluster · ${r.designation}</div>
                  </div>
                </div>
                <div style="display:flex; gap:12px;">
                  <button class="btn-action btn-reject" data-id="${r.id}">Reject</button>
                  <button class="btn-action btn-approve-action" data-id="${r.id}">Approve Access</button>
                </div>
              </div>
            `).join('') || '<p style="text-align:center;color:#6b7280;padding:40px;">Verification queue is currently empty.</p>'}
          </div>
        </div>
        
        <div class="glass-card">
          <h3 style="font-size:1.25rem; font-weight:800; margin-bottom:32px;">Real-time Mapping Registry</h3>
          <div style="display:flex; flex-direction:column; gap:20px;">
            ${[
              ['Dr. Sarah Wilson', 'synchronized with', 'CSE 2025 Cluster', '12 mins ago'],
              ['Arjun Mehta', 'activated for', 'Information Technology', '3 hours ago'],
              ['System Override:', 'Prof. Kumar reassigned to', 'MBA Analytics', 'Yesterday']
            ].map(([a, b, c, d]) => `
              <div style="display:flex; gap:16px; align-items:flex-start; padding-bottom:20px; border-bottom:1px solid var(--admin-border);">
                <div style="width:10px; height:10px; border-radius:50%; background:var(--admin-accent); margin-top:6px; box-shadow: 0 0 10px var(--admin-accent-glow);"></div>
                <div style="flex:1;">
                  <div style="font-size:0.95rem;"><strong style="color:white;">${a}</strong> <span style="color:#9ca3af;">${b}</span> <strong style="color:var(--admin-accent);">${c}</strong></div>
                  <div style="font-size:0.75rem; color:#6b7280; margin-top:6px; font-weight:600;">TIMESTAMP: ${d}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <div style="display:flex; flex-direction:column; gap:32px;">
        <div class="glass-card" style="background: linear-gradient(135deg, rgba(124,58,237,0.1), rgba(34,211,238,0.1)); border: 1px solid rgba(124,58,237,0.2);">
          <h3 style="font-size:1.1rem; font-weight:800; margin-bottom:24px;">Linkage Readiness</h3>
          <div style="display:flex; flex-direction:column; gap:24px;">
            <div>
              <div style="display:flex; justify-content:space-between; font-size:0.85rem; font-weight:700; margin-bottom:10px;">
                <span>Faculty Saturation</span>
                <span style="color:#10b981;">82%</span>
              </div>
              <div class="progress-bar-premium"><div class="progress-fill" style="width:82%"></div></div>
            </div>
            <div>
              <div style="display:flex; justify-content:space-between; font-size:0.85rem; font-weight:700; margin-bottom:10px;">
                <span>Student Linkage</span>
                <span style="color:#fbbf24;">65%</span>
              </div>
              <div class="progress-bar-premium"><div class="progress-fill" style="width:65%; background:#fbbf24; box-shadow:0 0 15px rgba(251,191,36,0.3);"></div></div>
            </div>
          </div>
          <button class="btn btn-primary" style="width:100%; margin-top:32px; height:48px; border-radius:14px; font-weight:800;">Run Auto-Sync Engine</button>
        </div>

        <div class="glass-card">
          <h3 style="font-size:1.1rem; font-weight:800; margin-bottom:20px;">Orchestration Tasks</h3>
          <div style="display:grid; grid-template-columns:1fr; gap:12px;">
            <button class="btn btn-secondary" style="justify-content:center; border-radius:14px; padding:14px;">Batch Cluster Assignment</button>
            <button class="btn btn-secondary" style="justify-content:center; border-radius:14px; padding:14px;">Sync Global Access Control</button>
            <button class="btn btn-secondary" style="justify-content:center; border-radius:14px; padding:14px;">Audit Access History</button>
            <button class="btn btn-secondary" style="justify-content:center; border-radius:14px; padding:14px; color:#ef4444; border-color:rgba(239,68,68,0.2);">Purge Inactive Mappings</button>
          </div>
        </div>
      </div>
    </div>
    `;
  }

  function renderRequests() {
    return `
    <div class="glass-card">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:32px;">
        <h3 style="font-size:1.5rem; font-weight:800; letter-spacing:-0.02em;">Faculty Verification Queue</h3>
        <div style="display:flex; gap:12px;">
          <input type="text" placeholder="Search by name or cluster..." class="input" style="width:300px; background:rgba(0,0,0,0.2); border-color:rgba(255,255,255,0.1);">
          <button class="btn btn-secondary">Filters</button>
        </div>
      </div>
      <table class="premium-table">
        <thead>
          <tr>
            <th>Advisor Identity</th>
            <th>Cluster UID</th>
            <th>Department</th>
            <th>Role Status</th>
            <th>Verification</th>
            <th style="text-align:right;">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${state.facultyRequests.map(r => `
            <tr>
              <td>
                <div style="font-weight:700; color:white;">${r.name}</div>
                <div style="font-size:0.75rem; color:#6b7280; margin-top:2px;">${r.email}</div>
              </td>
              <td style="font-family:'JetBrains Mono', monospace; font-size:0.85rem; color:var(--admin-accent);">${r.facultyId}</td>
              <td style="font-weight:600;">${r.dept}</td>
              <td style="color:#9ca3af;">${r.designation}</td>
              <td><span class="status-pill status-${r.status.toLowerCase()}">${r.status}</span></td>
              <td>
                <div style="display:flex; gap:10px; justify-content:flex-end;">
                  ${r.status === 'Pending' ? `
                    <button class="btn-action btn-approve btn-approve-action" data-id="${r.id}">Approve</button>
                    <button class="btn-action btn-reject">Deny</button>
                  ` : `<button class="btn btn-sm btn-ghost">View Audit Profile</button>`}
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    `;
  }

  function renderMapping() {
    return `
    <div class="mapping-wizard-grid">
      <div class="glass-card">
        <h3 style="font-size:1.25rem; font-weight:800; margin-bottom:24px;">1. Select Advisor Target</h3>
        <div class="faculty-selector">
          ${state.facultyList.map(f => `
            <div class="mapping-item ${f.id === 1 ? 'selected' : ''}">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <div style="display:flex; gap:16px; align-items:center;">
                  <div style="width:40px; height:40px; border-radius:12px; background:rgba(255,255,255,0.03); display:flex; align-items:center; justify-content:center; font-weight:800; color:var(--admin-accent); border:1px solid var(--admin-border);">${f.name[0]}</div>
                  <div>
                    <div style="font-weight:700;">${f.name}</div>
                    <div style="font-size:0.75rem; color:#6b7280;">Cluster: ${f.dept} · State: ${f.access || 'Inactive'}</div>
                  </div>
                </div>
                <div style="width:20px; height:20px; border:2px solid var(--admin-accent); border-radius:50%; display:flex; align-items:center; justify-content:center;">
                   ${f.id === 1 ? '<div style="width:10px; height:10px; background:var(--admin-accent); border-radius:50%;"></div>' : ''}
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      
      <div style="display:flex; flex-direction:column; gap:32px;">
        <div class="glass-card">
          <h3 style="font-size:1.25rem; font-weight:800; margin-bottom:24px;">2. Orchestration Config</h3>
          <div style="display:flex; flex-direction:column; gap:20px;">
            <div class="input-group">
              <label class="input-label" style="color:#9ca3af; font-size:0.8rem;">Multi-Cluster Assignment</label>
              <select class="input" multiple style="height:140px; padding:12px; background:rgba(0,0,0,0.2); border-color:var(--admin-border); line-height:1.8;">
                <option selected>Computer Science Engineering (CSE)</option>
                <option>Information Technology (IT)</option>
                <option>Electronics & Communication (ECE)</option>
                <option>MBA / Management Studies</option>
                <option>Mechanical Engineering</option>
              </select>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
              <div class="input-group">
                <label class="input-label" style="color:#9ca3af; font-size:0.8rem;">Target Batch</label>
                <select class="input" style="background:rgba(0,0,0,0.2);"><option>Batch 2025</option><option>Batch 2026</option></select>
              </div>
              <div class="input-group">
                <label class="input-label" style="color:#9ca3af; font-size:0.8rem;">Cluster Group</label>
                <select class="input" style="background:rgba(0,0,0,0.2);"><option>Section Alpha</option><option>Section Beta</option></select>
              </div>
            </div>
            <div style="padding:20px; background:rgba(124,58,237,0.05); border-radius:20px; border:1px solid rgba(124,58,237,0.2); display:flex; justify-content:space-between; align-items:center;">
                <div>
                  <div style="font-weight:700; font-size:0.9rem;">Workspace Activation</div>
                  <div style="font-size:0.75rem; color:#9ca3af; margin-top:2px;">Enable dashboard access for this advisor</div>
                </div>
                <label class="switch"><input type="checkbox" checked><span class="slider round"></span></label>
            </div>
            <button class="btn btn-primary" style="width:100%; height:52px; border-radius:16px; font-weight:800; font-size:1rem;">Commit Orchestration →</button>
          </div>
        </div>
      </div>
    </div>
    `;
  }

  function renderAssignment() {
    return `
    <div class="glass-card">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:32px;">
        <div>
          <h3 style="font-size:1.5rem; font-weight:800; letter-spacing:-0.02em;">Student Linkage Control</h3>
          <p style="color:#6b7280; font-size:0.9rem; margin-top:4px;">Map individual student nodes to designated Faculty Advisors</p>
        </div>
        <div style="display:flex; gap:12px;">
          <input type="text" placeholder="Search by Reg No or Identity..." class="input" style="width:300px; background:rgba(0,0,0,0.2);">
          <button class="btn btn-primary">Bulk Orchestrate</button>
        </div>
      </div>
      
      <table class="premium-table">
        <thead>
          <tr>
            <th>Student Node</th>
            <th>Identity UID</th>
            <th>Cluster Mapping</th>
            <th>Assigned Mentor</th>
            <th>Status</th>
            <th style="text-align:right;">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${state.students.map(s => `
            <tr>
              <td><div style="font-weight:700; color:white;">${s.name}</div></td>
              <td style="font-family:'JetBrains Mono', monospace; font-size:0.85rem; color:var(--admin-accent);">${s.regNo}</td>
              <td style="font-weight:600; color:#9ca3af;">${s.dept} · ${s.batch}</td>
              <td style="font-weight:700;">${s.faculty === 'None' ? '<span style="color:#ef4444; font-size:0.8rem;">⚠️ UNLINKED</span>' : `👤 ${s.faculty}`}</td>
              <td><span class="status-pill ${s.status === 'Assigned' ? 'status-approved' : 'status-pending'}">${s.status}</span></td>
              <td style="text-align:right;"><button class="btn-action btn-approve btn-assign-students" style="padding:8px 16px; font-size:0.75rem;" data-id="${s.id}">${s.status === 'Assigned' ? 'Re-link' : 'Establish Link'}</button></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    `;
  }

  function renderManagement() {
    return `
    <div class="glass-card">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:32px;">
        <h3 style="font-size:1.5rem; font-weight:800; letter-spacing:-0.02em;">Advisor Registry Control</h3>
        <button class="btn btn-primary" style="border-radius:14px; padding:12px 24px;">+ Force Register Advisor</button>
      </div>
      <table class="premium-table">
        <thead>
          <tr>
            <th>Faculty Advisor</th>
            <th>Cluster Coverage</th>
            <th>Assigned Nodes</th>
            <th>State</th>
            <th>Workspace Access</th>
            <th style="text-align:right;">Registry Actions</th>
          </tr>
        </thead>
        <tbody>
          ${state.facultyList.map(f => `
            <tr>
              <td><div style="font-weight:700; color:white;">${f.name}</div></td>
              <td style="font-weight:600; color:#9ca3af;">${f.dept} · ${f.batch === 'None' ? 'UNMAPPED' : f.batch}</td>
              <td style="font-weight:800; color:var(--admin-accent);">${f.totalStudents} Linked Nodes</td>
              <td><span class="status-pill status-approved">VERIFIED</span></td>
              <td><span class="status-pill ${f.access === 'Active' ? 'status-approved' : 'status-pending'}">${f.access || 'Inactive'}</span></td>
              <td>
                <div style="display:flex; gap:10px; justify-content:flex-end;">
                  <button class="btn-action btn-approve btn-activate-action" data-id="${f.id}" ${f.access === 'Active' ? 'disabled style="opacity:0.5;"' : ''}>Activate</button>
                  <button class="btn-action btn-reject" style="font-size:0.75rem;">Modify Access</button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    `;
  }

  render();
}
