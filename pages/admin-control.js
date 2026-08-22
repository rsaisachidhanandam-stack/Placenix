// ============================================================
// PLACENIX — INSTITUTIONAL ADMIN CONTROL
// ============================================================

export async function loadAdminControl(root, Store, supabase) {
  const hash = window.location.hash.replace(/^#+/, '');
  
  // Show a beautiful loader while syncing neural grid
  root.innerHTML = `
    <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:60vh; color:var(--text-muted);">
      <div class="animate-spin" style="width:40px; height:40px; border:4px solid var(--border-subtle); border-top-color:var(--brand-primary); border-radius:50%; margin-bottom:20px;"></div>
      Synchronizing Operational Registry with Supabase Core...
    </div>
  `;

  const dbClient = (supabase && typeof supabase.from === 'function') ? supabase
                 : (window.supabase && typeof window.supabase.from === 'function') ? window.supabase
                 : null;

  // 1. Pull live Departments and bound Section nodes from Supabase
  if (dbClient) {
    try {
      const { data: dbDepts, error: deptErr } = await dbClient
        .from('departments')
        .select(`
          id,
          name,
          sections (
            section_name
          )
        `);

      if (!deptErr && dbDepts) {
        Store.departments = dbDepts.map(d => ({
          id: d.id,
          name: d.name,
          sections: d.sections ? d.sections.map(s => s.section_name) : []
        }));
      }
    } catch (err) {
      console.warn('⚠️ Sync failure on Departments namespace:', err);
    }
  }

  if (!Store.departments || Store.departments.length === 0) {
    Store.departments = [
      { id: 'CSE', name: 'Computer Science & Engineering', sections: ['A', 'B', 'C'] },
      { id: 'ECE', name: 'Electronics & Communication', sections: ['A', 'B'] },
      { id: 'MECH', name: 'Mechanical Engineering', sections: ['A'] }
    ];
  }

  // 2. Pull live Staff Profiles and mappings from Supabase
  if (dbClient) {
    try {
      const { data: dbStaff, error: staffErr } = await dbClient
        .from('staff_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (!staffErr && dbStaff) {
        Store.staff = dbStaff;
      }
    } catch (err) {
      console.warn('⚠️ Sync failure on Staff namespace:', err);
    }
  }

  if (!Store.staff || Store.staff.length === 0) {
    Store.staff = [
      { id: 1, name: 'Faculty Advisor 1', email: 'fa1@gamail.com', status: 'Approved', role: 'faculty', mapping: 'Computer Science & Engineering - Section A' },
      { id: 2, name: 'Department Coordinator', email: 'dept@gmail.com', status: 'Approved', role: 'coordinator', mapping: 'Computer Science & Engineering' },
      { id: 3, name: 'Placement Officer (TPO)', email: 'saiganka2410@gmail.com', status: 'Approved', role: 'tpo', mapping: 'Global' },
      { id: 4, name: 'Institutional Admin', email: 'srithikansrinivasan+admin@gmail.com', status: 'Approved', role: 'admin', mapping: 'Global' }
    ];
  }

  // 3. Pull live Degree Programs and Academic Batches from Supabase
  if (dbClient) {
    try {
      const { data: dbDegrees } = await dbClient.from('degrees').select('*').order('degree_name');
      const { data: dbBatches } = await dbClient.from('academic_batches').select('*').order('batch_name');
      if (dbDegrees) Store.degrees = dbDegrees;
      if (dbBatches) Store.batches = dbBatches;
    } catch (err) {
      console.warn('⚠️ Sync failure on Degrees/Batches namespace:', err);
    }
  }
  if (!Store.degrees || Store.degrees.length === 0) {
    Store.degrees = [
      { degree_name: 'B.Tech' },
      { degree_name: 'M.Tech' },
      { degree_name: 'MBA' }
    ];
  }
  if (!Store.batches || Store.batches.length === 0) {
    Store.batches = [
      { batch_name: '2021 - 2025' },
      { batch_name: '2022 - 2026' },
      { batch_name: '2023 - 2027' },
      { batch_name: '2024 - 2028' }
    ];
  }

  const render = () => {
    let content = '';
    if (hash === 'admin-setup') content = renderSetup(Store);
    else if (hash === 'admin-staff' || hash === 'admin-roles') content = renderStaff(Store);
    else if (hash === 'admin-mapping') content = renderMapping(Store);
    else content = renderSetup(Store);

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
        .admin-select { width: 100%; height: 44px; background: rgba(255,255,255,0.02); border: 1px solid var(--border-main); color: #fff; padding: 0 16px; border-radius: 12px; font-size: 14px; }
        .admin-select option { background: #18181b; color: #fff; }
      </style>
    `;
  };

  window.handleCreateDept = async () => {
    const nameInput = document.getElementById('dept-name-input');
    const codeInput = document.getElementById('dept-code-input');
    const name = nameInput?.value.trim();
    const code = codeInput?.value.trim().toUpperCase();

    if (!name || !code) {
      alert('Error: Both Department Name and Department Code must be provided.');
      return;
    }
    if (Store.departments.some(d => d.id === code)) {
      alert(`Error: A department with the identifier "${code}" already exists.`);
      return;
    }

    try {
      const { error } = await supabase
        .from('departments')
        .insert([{ id: code, name: name }]);
      if (error) throw error;
      
      Store.departments.push({ id: code, name: name, sections: [] });
      render();
    } catch (err) {
      alert('Database Insert Refused: ' + err.message);
    }
  };

  window.handleCreateSection = async () => {
    const deptSelect = document.getElementById('section-dept-select');
    const nameInput = document.getElementById('section-name-input');
    const deptId = deptSelect?.value;
    const sectionName = nameInput?.value.trim();

    if (!deptId || deptId === 'Select Department...') {
      alert('Error: Please specify the Target Department.');
      return;
    }
    if (!sectionName) {
      alert('Error: Section / Batch Identifier cannot be empty.');
      return;
    }

    const dept = Store.departments.find(d => d.id === deptId);
    if (dept) {
      if (dept.sections.includes(sectionName)) {
        alert(`Error: Section "${sectionName}" already exists under ${deptId}.`);
        return;
      }

      try {
        const { error } = await supabase
          .from('sections')
          .insert([{ department_id: deptId, section_name: sectionName }]);
        if (error) throw error;

        dept.sections.push(sectionName);
        render();
      } catch (err) {
        alert('Database Section Node Refused: ' + err.message);
      }
    }
  };

  window.promptAddSection = async (deptId) => {
    const sectionName = prompt(`Configure new Section node for ${deptId}:`);
    if (sectionName && sectionName.trim()) {
      const dept = Store.departments.find(d => d.id === deptId);
      const target = sectionName.trim();
      if (dept && !dept.sections.includes(target)) {
        try {
          const { error } = await supabase
            .from('sections')
            .insert([{ department_id: deptId, section_name: target }]);
          if (error) throw error;

          dept.sections.push(target);
          render();
        } catch (err) {
          alert('Database Section Node Refused: ' + err.message);
        }
      } else if (dept) {
        alert('Error: Section already exists.');
      }
    }
  };

  window.handleCreateDegree = async () => {
    const input = document.getElementById('degree-name-input');
    const name = input?.value.trim();
    if (!name) return alert('Error: Degree Program Name cannot be empty.');
    
    try {
      const { error } = await supabase
        .from('degrees')
        .insert([{ degree_name: name }]);
      if (error) throw error;
      
      Store.degrees.push({ degree_name: name });
      render();
      alert(`Success: "${name}" degree program initialized.`);
    } catch (err) { 
      alert('Database Insert Refused: ' + err.message); 
    }
  };

  window.handleCreateBatch = async () => {
    const input = document.getElementById('batch-name-input');
    const name = input?.value.trim();
    if (!name) return alert('Error: Academic Batch designator cannot be empty.');
    
    try {
      const { error } = await supabase
        .from('academic_batches')
        .insert([{ batch_name: name }]);
      if (error) throw error;
      
      Store.batches.push({ batch_name: name });
      render();
      alert(`Success: Academic batch "${name}" initialized.`);
    } catch (err) { 
      alert('Database Insert Refused: ' + err.message); 
    }
  };

  window.handleApproveStaff = async (id) => {
    const selector = document.getElementById(`role-select-${id}`);
    const role = selector?.value;
    
    if (!role || role === 'none') {
      alert('Error: Please assign an institutional role before authenticating.');
      return;
    }
    
    const targetMapping = role === 'tpo' ? 'Global' : 'None';

    try {
      const { error } = await supabase
        .from('staff_profiles')
        .update({ 
          status: 'Approved', 
          role: role,
          mapping: targetMapping 
        })
        .eq('id', id);
        
      if (error) throw error;

      const person = Store.staff.find(s => s.id === id);
      if (person) {
        person.status = 'Approved';
        person.role = role;
        person.mapping = targetMapping;
        render();
      }
    } catch (err) {
      alert('Supabase Operation Refused: ' + err.message);
    }
  };

  window.handleRejectStaff = async (id) => {
    if (confirm('Are you sure you want to reject this authorization request?')) {
      try {
        const { error } = await supabase
          .from('staff_profiles')
          .delete()
          .eq('id', id);

        if (error) throw error;
        
        Store.staff = Store.staff.filter(s => s.id !== id);
        render();
      } catch (err) {
        alert('Supabase Operation Refused: ' + err.message);
      }
    }
  };

  window.handleRevokeStaff = async (id) => {
    if (confirm('Are you sure you want to revoke active credentials for this staff node?')) {
      try {
        const { error } = await supabase
          .from('staff_profiles')
          .update({ status: 'Pending', role: 'None', mapping: 'None' })
          .eq('id', id);

        if (error) throw error;

        const person = Store.staff.find(s => s.id === id);
        if (person) {
          person.status = 'Pending';
          person.role = 'None';
          person.mapping = 'None';
          render();
        }
      } catch (err) {
        alert('Supabase Operation Refused: ' + err.message);
      }
    }
  };

  window.handleRoleUpdate = async (id, newRole) => {
    const targetMapping = newRole === 'tpo' ? 'Global' : 'None';
    try {
      const { error } = await supabase
        .from('staff_profiles')
        .update({ role: newRole, mapping: targetMapping })
        .eq('id', id);

      if (error) throw error;

      const person = Store.staff.find(s => s.id === id);
      if (person) {
        person.role = newRole;
        person.mapping = targetMapping;
        render();
        alert(`System role for ${person.name} updated to ${newRole.toUpperCase()}.`);
      }
    } catch (err) {
      alert('Supabase Role Update Failed: ' + err.message);
    }
  };

  window.handleUpdateMapping = async (id) => {
    const deptSelect = document.getElementById(`map-dept-select-${id}`);
    const sectionSelect = document.getElementById(`map-section-select-${id}`);
    const dept = deptSelect?.value;
    const sec = sectionSelect?.value;
    
    let mappingText = 'None';
    if (dept === 'global') {
      mappingText = 'Global';
    } else if (dept && dept !== 'Select Dept...') {
      mappingText = sec === 'all' ? dept : `${dept} - Section ${sec}`;
    }
    
    try {
      const { error } = await supabase
        .from('staff_profiles')
        .update({ mapping: mappingText })
        .eq('id', id);

      if (error) throw error;

      const person = Store.staff.find(s => s.id === id);
      if (person) {
        person.mapping = mappingText;
        render();
        alert(`Neural Mapping configuration updated for ${person.name}.`);
      }
    } catch (err) {
      alert('Supabase Mapping Update Refused: ' + err.message);
    }
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
            <input type="text" id="dept-name-input" class="admin-input" placeholder="e.g. Civil Engineering">
          </div>
          <div>
            <label class="label-ent" style="font-size:10px; margin-bottom:8px; display:block;">DEPARTMENT CODE</label>
            <input type="text" id="dept-code-input" class="admin-input" placeholder="e.g. CIVIL">
          </div>
          <button class="btn-premium" onclick="handleCreateDept()" style="height:48px; font-size:14px; margin-top:8px;">Initialize Department</button>
        </div>
      </div>

      <div class="admin-card">
        <h2 style="font-size:20px; font-weight:800; margin-bottom:24px;">Manage Sections</h2>
        <div style="display:flex; flex-direction:column; gap:16px;">
          <div>
            <label class="label-ent" style="font-size:10px; margin-bottom:8px; display:block;">TARGET DEPARTMENT</label>
            <select id="section-dept-select" class="admin-select">
              <option disabled selected>Select Department...</option>
              ${state.departments.map(d => `<option value="${d.id}">${d.name} (${d.id})</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="label-ent" style="font-size:10px; margin-bottom:8px; display:block;">SECTION / BATCH IDENTIFIER</label>
            <input type="text" id="section-name-input" class="admin-input" placeholder="e.g. Section A">
          </div>
          <button class="btn-premium-ghost" onclick="handleCreateSection()" style="height:48px; font-size:14px; margin-top:8px; width:100%;">Create Section Node</button>
        </div>
      </div>

      <div class="admin-card">
        <h2 style="font-size:20px; font-weight:800; margin-bottom:24px;">Create Degree Program</h2>
        <div style="display:flex; flex-direction:column; gap:16px;">
          <div>
            <label class="label-ent" style="font-size:10px; margin-bottom:8px; display:block;">DEGREE NAME</label>
            <input type="text" id="degree-name-input" class="admin-input" placeholder="e.g. B.Tech or MBA">
          </div>
          <button class="btn-premium" onclick="handleCreateDegree()" style="height:48px; font-size:14px; margin-top:8px;">Initialize Degree</button>
        </div>
      </div>

      <div class="admin-card">
        <h2 style="font-size:20px; font-weight:800; margin-bottom:24px;">Manage Academic Batches</h2>
        <div style="display:flex; flex-direction:column; gap:16px;">
          <div>
            <label class="label-ent" style="font-size:10px; margin-bottom:8px; display:block;">BATCH DESIGNATOR</label>
            <input type="text" id="batch-name-input" class="admin-input" placeholder="e.g. 2021 - 2025">
          </div>
          <button class="btn-premium-ghost" onclick="handleCreateBatch()" style="height:48px; font-size:14px; margin-top:8px; width:100%;">Initialize Batch</button>
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
                <span onclick="promptAddSection('${d.id}')" style="background:rgba(255,255,255,0.05); color:var(--text-muted); font-size:11px; font-weight:800; padding:4px 10px; border-radius:6px; cursor:pointer;">+ Add Node</span>
              </div>
            </div>
          `).join('')}
        </div>

        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:32px; border-top:1px solid rgba(255,255,255,0.05); padding-top:32px; margin-top:32px;">
          <div>
            <h3 style="font-size:14px; font-weight:800; color:#fff; margin-bottom:16px; text-transform:uppercase; letter-spacing:0.05em; color:var(--text-muted);">Allocated Degree Nodes</h3>
            <div style="display:flex; gap:8px; flex-wrap:wrap;">
              ${(state.degrees || []).map(d => `<span style="background:rgba(255,255,255,0.03); border:1px solid var(--border-subtle); font-size:11px; font-weight:800; color:#fff; padding:6px 12px; border-radius:8px;">${d.degree_name}</span>`).join('')}
            </div>
          </div>
          <div>
            <h3 style="font-size:14px; font-weight:800; color:#fff; margin-bottom:16px; text-transform:uppercase; letter-spacing:0.05em; color:var(--text-muted);">Allocated Academic Batches</h3>
            <div style="display:flex; gap:8px; flex-wrap:wrap;">
              ${(state.batches || []).map(b => `<span style="background:rgba(255,255,255,0.03); border:1px solid var(--border-subtle); font-size:11px; font-weight:800; color:#fff; padding:6px 12px; border-radius:8px;">${b.batch_name}</span>`).join('')}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderStaff(state) {
  const pending = state.staff.filter(s => s.status === 'Pending' && s.role !== 'admin');
  const approved = state.staff.filter(s => s.status === 'Approved' && s.role !== 'admin');

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
                  <select id="role-select-${s.id}" class="admin-select" style="height:32px; font-size:12px; width:180px;">
                    <option value="none" selected>Select Role...</option>
                    <option value="faculty">Faculty Advisor</option>
                    <option value="coordinator">Dept. Coordinator</option>
                    <option value="department">Department Login</option>
                    <option value="tpo">TPO Login</option>
                  </select>
                </td>
                <td style="text-align:right;">
                  <button onclick="handleApproveStaff(${s.id})" class="btn-premium" style="padding:6px 12px; font-size:11px; border-radius:8px; margin-right:8px; cursor:pointer;">Authenticate</button>
                  <button onclick="handleRejectStaff(${s.id})" class="btn-premium-ghost" style="padding:6px 12px; font-size:11px; border-radius:8px; border-color:#ef4444; color:#ef4444; cursor:pointer;">Reject</button>
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
                  <select onchange="handleRoleUpdate(${s.id}, this.value)" class="admin-select" style="height:32px; font-size:12px; width:180px;">
                    <option value="faculty" ${s.role === 'faculty' ? 'selected' : ''}>Faculty Advisor</option>
                    <option value="coordinator" ${s.role === 'coordinator' ? 'selected' : ''}>Dept. Coordinator</option>
                    <option value="department" ${s.role === 'department' ? 'selected' : ''}>Department Login</option>
                    <option value="tpo" ${s.role === 'tpo' ? 'selected' : ''}>TPO Login</option>
                  </select>
                </td>
                <td>
                  <span style="font-size:12px; font-weight:600; color:var(--text-description);">${s.mapping}</span>
                </td>
                <td style="text-align:right;">
                  <span onclick="handleRevokeStaff(${s.id})" class="status-pill status-success" style="font-size:10px; cursor:pointer; border: 1px solid #ef4444; color: #ef4444; background: rgba(239, 68, 68, 0.1);">Revoke Access</span>
                </td>
              </tr>
            `).join('')}
            ${approved.length === 0 ? `<tr><td colspan="4" style="text-align:center; color:var(--text-muted); padding:32px;">No active staff enrolled.</td></tr>` : ''}
          </tbody>
        </table>
      </div>
      
    </div>
  `;
}

function renderMapping(state) {
  const approved = state.staff.filter(s => s.status === 'Approved' && s.role !== 'admin');

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
              <select id="map-dept-select-${s.id}" class="admin-select" style="height:36px; font-size:12px;">
                <option disabled ${s.mapping === 'None' ? 'selected' : ''}>Select Dept...</option>
                <option value="global" ${s.mapping === 'Global' ? 'selected' : ''}>Global (All)</option>
                ${state.departments.map(d => `<option value="${d.id}" ${s.mapping.includes(d.id) ? 'selected' : ''}>${d.name}</option>`).join('')}
              </select>
            </div>

            <!-- Target Section -->
            <div>
              <label class="label-ent" style="font-size:9px; margin-bottom:6px; display:block;">MAP SECTION / BATCH</label>
              <select id="map-section-select-${s.id}" class="admin-select" style="height:36px; font-size:12px;">
                <option value="all" ${!s.mapping.includes('Section') ? 'selected' : ''}>All Sections</option>
                <option value="A" ${s.mapping.includes('Section A') ? 'selected' : ''}>Section A</option>
                <option value="B" ${s.mapping.includes('Section B') ? 'selected' : ''}>Section B</option>
                <option value="C" ${s.mapping.includes('Section C') ? 'selected' : ''}>Section C</option>
              </select>
            </div>

            <!-- Action -->
            <div>
              <button onclick="handleUpdateMapping(${s.id})" class="btn-premium" style="height:36px; padding:0 20px; font-size:11px; margin-top:14px; cursor:pointer;">Update Map</button>
            </div>

          </div>
        `).join('')}
        ${approved.length === 0 ? `<div style="text-align:center; color:var(--text-muted); padding:24px;">No active staff available to map.</div>` : ''}
      </div>
    </div>
  `;
}
