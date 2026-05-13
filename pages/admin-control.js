// ============================================================
// PLACENIX — INSTITUTIONAL ADMIN CONTROL
// ============================================================

export async function loadAdminControl(root, Store) {
  const hash = window.location.hash.replace('#', '');
  
  const state = {
    departments: [
      { id: 'CSE', name: 'Computer Science & Engineering', sections: ['A', 'B', 'C'] },
      { id: 'ECE', name: 'Electronics & Communication', sections: ['A', 'B'] },
      { id: 'MECH', name: 'Mechanical Engineering', sections: ['A'] }
    ],
    staff: [
      { id: 1, name: 'Dr. Ramesh Kumar', email: 'ramesh.k@univ.edu', status: 'Pending', role: 'None', mapping: 'None' },
      { id: 2, name: 'Prof. Anita Desai', email: 'anita.d@univ.edu', status: 'Approved', role: 'faculty', mapping: 'CSE - Section A' },
      { id: 3, name: 'Srinivas Rao', email: 'srinivas.r@univ.edu', status: 'Pending', role: 'None', mapping: 'None' },
      { id: 4, name: 'Dr. John Doe', email: 'johndoe@univ.edu', status: 'Approved', role: 'coordinator', mapping: 'MECH' },
      { id: 5, name: 'TPO Office', email: 'tpo@univ.edu', status: 'Approved', role: 'tpo', mapping: 'Global' }
    ]
  };

  const render = () => {
    let content = '';
    if (hash === 'admin-setup') content = renderSetup(state);
    else if (hash === 'admin-staff' || hash === 'admin-roles') content = renderStaff(state);
    else if (hash === 'admin-mapping') content = renderMapping(state);
    else content = renderSetup(state);

    root.innerHTML = `
      <div style="padding: 40px; max-width: 1560px; margin: 0 auto; animation: fadeIn 0.4s ease-out;">
        <div style="margin-bottom: 40px; display:flex; justify-content:space-between; align-items:flex-end;">
          <div>
            <div class="label-ent" style="margin-bottom: 8px; color:var(--brand-primary);">Institutional Command Center</div>
            <h1 class="h1-ent">Global Access & Infrastructure</h1>
            <p style="color:var(--text-description); font-size:15px; margin-top:4px;">Manage operational architecture, staff authorization, and role mappings.</p>
          </div>
        </div>
        ${content}
      </div>
      <style>
        .admin-card { background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 20px; padding: 32px; }
        .admin-table { width: 100%; border-collapse: collapse; text-align: left; }
        .admin-table th { padding: 16px; font-size: 11px; font-weight: 800; color: var(--text-muted); text-transform: uppercase; border-bottom: 1px solid var(--border-main); }
        .admin-table td { padding: 16px; border-bottom: 1px solid var(--border-main); }
        .admin-table tr:hover td { background: rgba(255,255,255,0.02); }
        .admin-input { width: 100%; height: 44px; background: rgba(255,255,255,0.02); border: 1px solid var(--border-main); color: #fff; padding: 0 16px; border-radius: 12px; font-size: 14px; }
        .admin-input:focus { border-color: var(--brand-primary); outline: none; }
        .admin-select { width: 100%; height: 44px; background: rgba(255,255,255,0.02); border: 1px solid var(--border-main); color: #fff; padding: 0 16px; border-radius: 12px; font-size: 14px; appearance: none; }
      </style>
    `;
  };

  render();
}

function renderSetup(state) {
  return `
    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:32px;">
      <div class="admin-card">
        <h2 style="font-size:20px; font-weight:800; margin-bottom:24px;">Create Department</h2>
        <div style="display:flex; flex-direction:column; gap:16px;">
          <div>
            <label class="label-ent" style="font-size:10px; margin-bottom:8px; display:block;">DEPARTMENT NAME</label>
            <input type="text" class="admin-input" placeholder="e.g. Civil Engineering">
          </div>
          <div>
            <label class="label-ent" style="font-size:10px; margin-bottom:8px; display:block;">DEPARTMENT CODE</label>
            <input type="text" class="admin-input" placeholder="e.g. CIVIL">
          </div>
          <button class="btn-premium" style="height:48px; font-size:14px; margin-top:8px;">Initialize Department</button>
        </div>
      </div>

      <div class="admin-card">
        <h2 style="font-size:20px; font-weight:800; margin-bottom:24px;">Manage Sections</h2>
        <div style="display:flex; flex-direction:column; gap:16px;">
          <div>
            <label class="label-ent" style="font-size:10px; margin-bottom:8px; display:block;">TARGET DEPARTMENT</label>
            <select class="admin-select">
              <option disabled selected>Select Department...</option>
              ${state.departments.map(d => `<option value="${d.id}">${d.name} (${d.id})</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="label-ent" style="font-size:10px; margin-bottom:8px; display:block;">SECTION / BATCH IDENTIFIER</label>
            <input type="text" class="admin-input" placeholder="e.g. Section A">
          </div>
          <button class="btn-premium-ghost" style="height:48px; font-size:14px; margin-top:8px; width:100%;">Create Section Node</button>
        </div>
      </div>

      <div class="admin-card" style="grid-column: 1 / -1;">
        <h2 style="font-size:20px; font-weight:800; margin-bottom:24px;">Active Infrastructure Topology</h2>
        <div style="display:flex; flex-wrap:wrap; gap:24px;">
          ${state.departments.map(d => `
            <div style="background:rgba(255,255,255,0.015); border:1px solid var(--border-main); padding:24px; border-radius:16px; flex:1; min-width:280px;">
              <h3 style="font-size:16px; font-weight:800; color:#fff; margin-bottom:4px;">${d.name}</h3>
              <div style="font-size:12px; color:var(--text-muted); margin-bottom:16px; font-weight:700;">Code: ${d.id}</div>
              <div style="display:flex; gap:8px; flex-wrap:wrap;">
                ${d.sections.map(s => `<span style="background:var(--brand-violet-soft); color:var(--brand-primary); font-size:11px; font-weight:800; padding:4px 10px; border-radius:6px;">Section ${s}</span>`).join('')}
                <span style="background:rgba(255,255,255,0.05); color:var(--text-muted); font-size:11px; font-weight:800; padding:4px 10px; border-radius:6px; cursor:pointer;">+ Add Node</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

function renderStaff(state) {
  const pending = state.staff.filter(s => s.status === 'Pending');
  const approved = state.staff.filter(s => s.status === 'Approved');

  return `
    <div style="display:flex; flex-direction:column; gap:40px;">
      
      <div class="admin-card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
          <h2 style="font-size:20px; font-weight:800;">Pending Authorization Requests</h2>
          <span class="status-pill status-warning">${pending.length} Awaiting</span>
        </div>
        
        <table class="admin-table">
          <thead>
            <tr>
              <th>Staff Profile</th>
              <th>Email Signature</th>
              <th>Requested Role</th>
              <th style="text-align:right;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${pending.map(s => `
              <tr>
                <td>
                  <div style="font-weight:700; color:#fff;">${s.name}</div>
                </td>
                <td style="color:var(--text-description); font-size:13px;">${s.email}</td>
                <td>
                  <select class="admin-select" style="height:32px; font-size:12px; width:180px;">
                    <option value="none" selected>Select Role...</option>
                    <option value="faculty">Faculty Advisor</option>
                    <option value="coordinator">Dept. Coordinator</option>
                    <option value="tpo">TPO Login</option>
                  </select>
                </td>
                <td style="text-align:right;">
                  <button class="btn-premium" style="padding:6px 12px; font-size:11px; border-radius:8px; margin-right:8px;">Authenticate</button>
                  <button class="btn-premium-ghost" style="padding:6px 12px; font-size:11px; border-radius:8px; border-color:#ef4444; color:#ef4444;">Reject</button>
                </td>
              </tr>
            `).join('')}
            ${pending.length === 0 ? `<tr><td colspan="4" style="text-align:center; color:var(--text-muted); padding:32px;">No pending authorizations.</td></tr>` : ''}
          </tbody>
        </table>
      </div>

      <div class="admin-card">
        <h2 style="font-size:20px; font-weight:800; margin-bottom:24px;">Active Staff Roster & Roles</h2>
        <table class="admin-table">
          <thead>
            <tr>
              <th>Staff Profile</th>
              <th>System Role</th>
              <th>Current Mapping</th>
              <th style="text-align:right;">Access</th>
            </tr>
          </thead>
          <tbody>
            ${approved.map(s => `
              <tr>
                <td>
                  <div style="font-weight:700; color:#fff;">${s.name}</div>
                  <div style="font-size:11px; color:var(--text-muted);">${s.email}</div>
                </td>
                <td>
                  <select class="admin-select" style="height:32px; font-size:12px; width:180px;">
                    <option value="faculty" ${s.role === 'faculty' ? 'selected' : ''}>Faculty Advisor</option>
                    <option value="coordinator" ${s.role === 'coordinator' ? 'selected' : ''}>Dept. Coordinator</option>
                    <option value="tpo" ${s.role === 'tpo' ? 'selected' : ''}>TPO Login</option>
                  </select>
                </td>
                <td>
                  <span style="font-size:12px; font-weight:600; color:var(--text-description);">${s.mapping}</span>
                </td>
                <td style="text-align:right;">
                  <span class="status-pill status-success" style="font-size:10px; cursor:pointer;">Revoke Access</span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      
    </div>
  `;
}

function renderMapping(state) {
  const approved = state.staff.filter(s => s.status === 'Approved');

  return `
    <div class="admin-card">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:32px;">
        <div>
          <h2 style="font-size:20px; font-weight:800;">Operational Work Mapping</h2>
          <p style="font-size:13px; color:var(--text-description); margin-top:4px;">Link authenticated staff nodes to specific departments and sections.</p>
        </div>
      </div>

      <div style="display:flex; flex-direction:column; gap:16px;">
        ${approved.map(s => `
          <div style="background:rgba(255,255,255,0.015); border:1px solid var(--border-main); padding:20px; border-radius:16px; display:grid; grid-template-columns: 2fr 1fr 1fr auto; gap:24px; align-items:center;">
            
            <!-- Staff Info -->
            <div>
              <div style="display:flex; align-items:center; gap:12px;">
                <div style="width:36px; height:36px; background:var(--brand-violet-soft); border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:14px; font-weight:900; color:var(--brand-primary);">${s.name[0]}</div>
                <div>
                  <div style="font-weight:700; color:#fff; font-size:14px;">${s.name}</div>
                  <div style="font-size:11px; color:var(--text-muted); text-transform:uppercase; font-weight:800; margin-top:2px;">${s.role.replace('-', ' ')}</div>
                </div>
              </div>
            </div>

            <!-- Target Department -->
            <div>
              <label class="label-ent" style="font-size:9px; margin-bottom:6px; display:block;">MAP DEPARTMENT</label>
              <select class="admin-select" style="height:36px; font-size:12px;">
                <option disabled ${s.mapping === 'None' ? 'selected' : ''}>Select Dept...</option>
                <option value="global" ${s.mapping === 'Global' ? 'selected' : ''}>Global (All)</option>
                ${state.departments.map(d => `<option value="${d.id}" ${s.mapping.includes(d.id) ? 'selected' : ''}>${d.name}</option>`).join('')}
              </select>
            </div>

            <!-- Target Section -->
            <div>
              <label class="label-ent" style="font-size:9px; margin-bottom:6px; display:block;">MAP SECTION / BATCH</label>
              <select class="admin-select" style="height:36px; font-size:12px;">
                <option value="all" ${!s.mapping.includes('Section') ? 'selected' : ''}>All Sections</option>
                <option value="A" ${s.mapping.includes('Section A') ? 'selected' : ''}>Section A</option>
                <option value="B" ${s.mapping.includes('Section B') ? 'selected' : ''}>Section B</option>
                <option value="C" ${s.mapping.includes('Section C') ? 'selected' : ''}>Section C</option>
              </select>
            </div>

            <!-- Action -->
            <div>
              <button class="btn-premium" style="height:36px; padding:0 20px; font-size:11px; margin-top:14px;">Update Map</button>
            </div>

          </div>
        `).join('')}
      </div>
    </div>
  `;
}
