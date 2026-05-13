import { supabase } from '../supabase.js';

export async function loadProfilePage(root, Store, maybeSupabase, activeTabId = 'tab-personal') {
  let user = Store.session.user || {};
  
  // 0. Sync actual live user data from public profiles table
  try {
    const { data: dbUser } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
    if (dbUser) {
      user = { ...user, ...dbUser };
      Store.session.user = user; // Synced inside Store context!
    }
  } catch (err) { console.error('Profile direct sync failed:', err); }

  // Support optional signature where maybeSupabase is instead the tab string
  const currentTab = (typeof maybeSupabase === 'string') ? maybeSupabase : activeTabId;

  // Show sync indicator
  root.innerHTML = `
    <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:60vh; color:var(--text-muted);">
      <div class="animate-spin" style="width:36px; height:36px; border:3px solid var(--border-subtle); border-top-color:var(--brand-primary); border-radius:50%; margin-bottom:16px;"></div>
      Aligning Academic Profile Nodes...
    </div>
  `;

  // 1. Fetch complete organizational topology from Supabase
  let depts = [];
  try {
    const { data } = await supabase.from('departments').select('*, sections(*)');
    if (data) depts = data;
  } catch (err) { console.error('Topology sync failed:', err); }

  // 2. Check for active section requests
  let pendingReq = null;
  try {
    const { data } = await supabase
      .from('section_requests')
      .select('*')
      .eq('student_id', user.id)
      .eq('status', 'Pending')
      .maybeSingle();
    if (data) pendingReq = data;
  } catch (err) { console.error('Request scan failed:', err); }

  // 3. Fetch complete Degrees and Batches topology
  let degrees = [];
  let batches = [];
  try {
    const { data: dbDegrees } = await supabase.from('degrees').select('*').order('degree_name');
    const { data: dbBatches } = await supabase.from('academic_batches').select('*').order('batch_name');
    if (dbDegrees) degrees = dbDegrees;
    if (dbBatches) batches = dbBatches;
  } catch (err) {
    console.error('Degree/Batch topology sync failed:', err);
  }

  root.innerHTML = getProfileHTML(user, depts, pendingReq, degrees, batches, currentTab);
  initProfileScripts(user, Store, supabase, depts, pendingReq, currentTab);
}

function getProfileHTML(user, depts = [], pendingReq = null, degrees = [], batches = [], activeTabId = 'tab-personal') {
  return `
    <div style="padding: 48px; max-width: 1200px; margin: 0 auto;">
    <!-- Header Area -->
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:48px; background: linear-gradient(to right, rgba(255,255,255,0.02), transparent); padding:32px; border-radius:24px; border:1px solid var(--border-subtle);">
      <div style="display:flex; align-items:center; gap:24px;">
        <div style="width:80px; height:80px; border-radius:24px; background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary)); display:flex; align-items:center; justify-content:center; font-size:32px; font-weight:800; color:#fff; box-shadow: 0 8px 32px rgba(139, 92, 246, 0.3);">
          ${(user.full_name || 'U')[0].toUpperCase()}
        </div>
        <div>
          <h1 class="h1-ent" style="margin-bottom:6px; font-size:28px;">${user.full_name || 'Enterprise Identity'}</h1>
          <div style="display:flex; align-items:center; gap:12px; color:var(--text-muted); font-size:13px; font-weight:600;">
            <span>${user.roll_number || 'N/A'}</span>
            <span style="opacity:0.2;">•</span>
            <span>${user.department ? depts.find(d => d.id === user.department)?.name || 'General' : 'General'} · Section ${user.section_name || 'TBD'}</span>
            <span style="opacity:0.2;">•</span>
            <span>${user.college || 'Kalasalingam University'}</span>
          </div>
        </div>
        <button class="btn btn-primary" id="save-profile-btn" style="height:44px; padding:0 24px; border-radius:12px; font-weight:700;">Save Identity</button>
      </div>
    </div>

    <!-- Institutional Tabs -->
    <div style="display:flex; gap:32px; border-bottom:1px solid var(--border-subtle); margin-bottom:48px;">
      <div class="profile-tab ${activeTabId === 'tab-personal' ? 'active' : ''}" data-tab="tab-personal">Personal Workspace</div>
      <div class="profile-tab ${activeTabId === 'tab-academic' ? 'active' : ''}" data-tab="tab-academic">Academic Record</div>
      <div class="profile-tab ${activeTabId === 'tab-documents' ? 'active' : ''}" data-tab="tab-documents">Verification Vault</div>
    </div>

    <style>
      .profile-tab {
        padding: 16px 0; font-size: 15px; font-weight: 700; color: var(--text-muted); 
        cursor: pointer; position: relative; transition: var(--t-fast);
      }
      .profile-tab:hover { color: #fff; }
      .profile-tab.active { color: #fff; }
      .profile-tab.active::after {
        content: ''; position: absolute; bottom: -1px; left: 0; width: 100%; height: 2px;
        background: var(--brand-primary); box-shadow: 0 0 10px var(--brand-primary);
      }
    </style>

  <div class="profile-content ${activeTabId === 'tab-personal' ? 'active' : ''}" id="tab-personal" style="${activeTabId === 'tab-personal' ? '' : 'display:none;'}">
    <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 40px; align-items: stretch; margin-bottom: 40px;">
      <!-- Core Identity Node -->
      <div class="card-ent" style="display:flex; flex-direction:column; gap:24px;">
        <h3 class="h2-ent" style="font-size:16px;">Core Information</h3>
        <div style="display:flex; flex-direction:column; gap:20px;">
          <div class="input-node">
            <label class="label-ent">Legal Full Name</label>
            <input type="text" id="p_full_name" class="input-ent" value="${user.full_name || ''}">
          </div>
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px;">
            <div class="input-node">
              <label class="label-ent">Register Number</label>
              <input type="text" id="p_register_number" class="input-ent" value="${user.register_number || ''}">
            </div>
            <div class="input-node">
              <label class="label-ent">Roll Number</label>
              <input type="text" id="p_roll_number" class="input-ent" value="${user.roll_number || ''}">
            </div>
          </div>
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px;">
            <div class="input-node">
              <label class="label-ent">Gender Identity</label>
              <select id="p_gender" class="input-ent">
                <option value="Male" ${user.gender === 'Male' ? 'selected' : ''}>Male</option>
                <option value="Female" ${user.gender === 'Female' ? 'selected' : ''}>Female</option>
                <option value="Other" ${user.gender === 'Other' ? 'selected' : ''}>Other</option>
              </select>
            </div>
            <div class="input-node">
              <label class="label-ent">Date of Birth</label>
              <input type="date" id="p_dob" class="input-ent" value="${user.dob || ''}">
            </div>
          </div>
        </div>
      </div>

      <!-- Professional Nodes -->
      <div class="card-ent" style="display:flex; flex-direction:column; gap:24px;">
        <h3 class="h2-ent" style="font-size:16px;">Contact & Professional Nodes</h3>
        <div style="display:flex; flex-direction:column; gap:20px;">
          <div class="input-node">
            <label class="label-ent">Professional Email (Private)</label>
            <input type="email" id="p_personal_email" class="input-ent" value="${user.personal_email || ''}">
          </div>
          <div class="input-node">
            <label class="label-ent">Institutional Email</label>
            <input type="email" id="p_institutional_email" class="input-ent" value="${user.email || ''}" disabled>
          </div>
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px;">
            <div class="input-node">
              <label class="label-ent">Primary Mobile</label>
              <input type="tel" id="p_phone" class="input-ent" value="${user.mobile_number || ''}">
            </div>
            <div class="input-node">
              <label class="label-ent">Emergency Contact</label>
              <input type="tel" id="p_emergency" class="input-ent" value="${user.emergency_contact || ''}">
            </div>
          </div>
          <div class="input-node">
            <label class="label-ent">LinkedIn Workspace URL</label>
            <input type="text" id="p_linkedin" class="input-ent" value="${user.linkedin_url || ''}" placeholder="linkedin.com/in/username">
          </div>
        </div>
      </div>
    </div>

    <!-- Locality Infrastructure -->
    <div class="card-ent" style="display:flex; flex-direction:column; gap:32px;">
      <h3 class="h2-ent" style="font-size:16px;">Locality Information</h3>
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:40px;">
        <div class="input-node">
          <label class="label-ent">Permanent Residency</label>
          <textarea id="p_permanent_address" class="input-ent" style="height:80px; resize:none;">${user.permanent_address || ''}</textarea>
        </div>
        <div class="input-node">
          <label class="label-ent">Current Communication Address</label>
          <textarea id="p_current_address" class="input-ent" style="height:80px; resize:none;">${user.current_address || ''}</textarea>
        </div>
      </div>
      <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:20px;">
        <div class="input-node">
          <label class="label-ent">Country</label>
          <select id="p_country" class="input-ent" style="appearance:auto;">
            <option value="" disabled selected>Choose Country...</option>
          </select>
        </div>
        <div class="input-node">
          <label class="label-ent">State / Region</label>
          <select id="p_state" class="input-ent" style="appearance:auto;" disabled>
            <option value="" disabled selected>Choose State...</option>
          </select>
        </div>
        <div class="input-node">
          <label class="label-ent">City</label>
          <select id="p_city" class="input-ent" style="appearance:auto;" disabled>
            <option value="" disabled selected>Choose City...</option>
          </select>
        </div>
        <div class="input-node">
          <label class="label-ent">Postal Code</label>
          <input type="text" id="p_zip" class="input-ent" value="${user.pincode || ''}" placeholder="e.g. 626117">
        </div>
      </div>
    </div>
  </div>

  <div class="profile-content ${activeTabId === 'tab-academic' ? 'active' : ''}" id="tab-academic" style="${activeTabId === 'tab-academic' ? '' : 'display:none;'}">
    <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 40px; align-items: stretch; margin-bottom: 40px;">
      <!-- Institution Node -->
      <div class="card-ent" style="display:flex; flex-direction:column; gap:24px;">
        <h3 class="h2-ent" style="font-size:16px;">Institution Details (UG/PG)</h3>
        <div style="display:flex; flex-direction:column; gap:20px;">
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px;">
            <div class="input-node">
              <label class="label-ent">Degree Program</label>
              <select id="a_degree" class="input-ent" style="appearance:auto;">
                <option disabled ${!user.degree ? 'selected' : ''}>Choose Degree...</option>
                ${degrees.map(d => `<option value="${d.degree_name}" ${user.degree === d.degree_name ? 'selected' : ''}>${d.degree_name}</option>`).join('')}
              </select>
            </div>
            <div class="input-node">
              <label class="label-ent">Academic Batch</label>
              <select id="a_batch_year" class="input-ent" style="appearance:auto;">
                <option disabled ${!user.batch_year ? 'selected' : ''}>Choose Batch...</option>
                ${batches.map(b => `<option value="${b.batch_name}" ${user.batch_year === b.batch_name ? 'selected' : ''}>${b.batch_name}</option>`).join('')}
              </select>
            </div>
          </div>
          
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px;">
            <div class="input-node">
              <label class="label-ent">Major / Department</label>
              <select id="a_department" class="input-ent" style="appearance:auto;" ${user.section_name ? 'disabled' : ''}>
                <option disabled ${!user.department ? 'selected' : ''}>Select Department...</option>
                ${depts.map(d => `<option value="${d.id}" ${user.department === d.id ? 'selected' : ''}>${d.name}</option>`).join('')}
              </select>
            </div>
            <div class="input-node">
              <label class="label-ent">Section Node</label>
              <select id="a_section" class="input-ent" style="appearance:auto;" ${user.section_name ? 'disabled' : ''}>
                <option disabled ${!user.section_name ? 'selected' : ''}>Select Section...</option>
                ${(() => {
                  const curDept = depts.find(d => d.id === user.department);
                  if (curDept && curDept.sections) {
                    return curDept.sections.map(s => `<option value="${s.section_name}" ${user.section_name === s.section_name ? 'selected' : ''}>Section ${s.section_name}</option>`).join('');
                  }
                  return '';
                })()}
              </select>
            </div>
          </div>

          ${user.section_name ? `
            <div style="background:rgba(255,255,255,0.02); border:1px solid var(--border-subtle); border-radius:16px; padding:20px; margin-top:8px; border-left: 4px solid var(--brand-primary);">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                  <div style="font-weight:800; color:#fff; font-size:13px;">System Section Node Locked</div>
                  <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">Requires Administrative intervention to modify.</div>
                </div>
                ${pendingReq ? `
                  <span style="background:rgba(245,158,11,0.1); border:1px solid #f59e0b; color:#f59e0b; font-size:11px; font-weight:800; padding:6px 12px; border-radius:8px;">⚠️ Pending Review</span>
                ` : `
                  <button type="button" class="btn-premium-ghost" id="request-transfer-trigger" style="height:32px; font-size:10px; padding:0 12px; border-radius:8px;">Request Transfer</button>
                `}
              </div>
              
              ${pendingReq ? `
                <div style="margin-top:12px; font-size:12px; color:var(--text-description); background:rgba(255,255,255,0.01); padding:12px; border-radius:8px; border:1px dashed var(--border-subtle);">
                  Requested target: <strong>Section ${pendingReq.target_section}</strong>. Awaiting Faculty Advisor acceptance.
                </div>
              ` : `
                <div id="transfer-request-panel" style="display:none; flex-direction:column; gap:16px; margin-top:16px; border-top:1px solid rgba(255,255,255,0.05); padding-top:16px; animation: fadeIn 0.3s ease;">
                  <div class="input-node">
                    <label class="label-ent" style="font-size:9px;">TARGET SECTION NODE</label>
                    <select id="t_target_section" class="input-ent" style="height:38px; font-size:12px; appearance:auto;">
                      <option disabled selected>Choose target...</option>
                      ${(() => {
                        const curDept = depts.find(d => d.id === user.department);
                        if (curDept && curDept.sections) {
                          return curDept.sections.filter(s => s.section_name !== user.section_name).map(s => `<option value="${s.section_name}">Section ${s.section_name}</option>`).join('');
                        }
                        return '';
                      })()}
                    </select>
                  </div>
                  <div class="input-node">
                    <label class="label-ent" style="font-size:9px;">JUSTIFICATION FOR PROPOSAL</label>
                    <textarea id="t_reason" class="input-ent" style="height:70px; font-size:12px; padding:12px; resize:none;" placeholder="State clear purpose for your proposed section reassignment..."></textarea>
                  </div>
                  <button type="button" class="btn-premium" id="submit-transfer-btn" style="height:38px; font-size:11px; border-radius:10px; width:100%; cursor:pointer;">Transmit Proposal to Advisor</button>
                </div>
              `}
            </div>
          ` : ''}

          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px;">
            <div class="input-node">
              <label class="label-ent">Current Semester</label>
              <select id="a_current_semester" class="input-ent">
                ${[1,2,3,4,5,6,7,8].map(s => `<option value="${s}" ${user.current_semester == s ? 'selected' : ''}>Semester ${s}</option>`).join('')}
              </select>
            </div>
            <div class="input-node">
              <label class="label-ent">Verified CGPA</label>
              <input type="number" step="0.01" id="a_cgpa" class="input-ent" value="${user.cgpa || ''}">
            </div>
          </div>
        </div>
      </div>

      <!-- Skills Node -->
      <div class="card-ent" style="display:flex; flex-direction:column; gap:24px;">
        <h3 class="h2-ent" style="font-size:16px;">Skill Readiness Registry</h3>
        <div style="display:flex; flex-direction:column; gap:20px;">
          <div class="input-node">
            <label class="label-ent">Technical Stack (Expertise)</label>
            <input type="text" id="a_technical_skills" class="input-ent" placeholder="e.g. Python, React, AWS" value="${user.technical_skills || (user.skills || []).join(', ')}">
          </div>
          <div class="input-node">
            <label class="label-ent">Behavioral / Soft Skills</label>
            <input type="text" id="a_soft_skills" class="input-ent" placeholder="e.g. Leadership, Strategic Thinking" value="${user.soft_skills || ''}">
          </div>
          <div id="experience-list" style="display:flex; flex-direction:column; gap:12px; margin-top:8px;"></div>
          <button class="btn-premium-ghost" id="add-exp-btn" style="width:100%; border-radius:12px; padding:12px;">+ Add Internship / Industry Project</button>
        </div>
      </div>
    </div>
  </div>

  <div class="profile-content ${activeTabId === 'tab-documents' ? 'active' : ''}" id="tab-documents" style="${activeTabId === 'tab-documents' ? '' : 'display:none;'}">
    <div class="card-ent" style="padding:48px;">
      <div style="margin-bottom:48px;">
        <h3 class="h2-ent" style="font-size:24px;">Verification Vault</h3>
        <p style="color:var(--text-description); font-size:14px; margin-top:4px;">Securely manage institutional and professional credentials with blockchain-grade integrity.</p>
      </div>
      
      <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:24px;">
        ${renderDocCard(user, 'Primary Resume', '📝', 'ATS Ready PDF')}
        ${renderDocCard(user, 'College ID Card', '🪪', 'Verification PDF')}
        ${renderDocCard(user, '10th Marksheet', '🎓', 'Academic Record')}
        ${renderDocCard(user, '12th Marksheet', '🎓', 'Academic Record')}
        ${renderDocCard(user, 'Aadhaar Card', '📄', 'Identity Record')}
        ${renderDocCard(user, 'PAN Card', '📄', 'Tax Identity')}
      </div>
    </div>
  </div>

  <div id="exp-modal" class="modal-overlay" style="display:none;">
    <div class="modal">
      <div class="modal-header">
        <h3 class="modal-title">Experience Registry</h3>
        <button class="btn-ghost" onclick="document.getElementById('exp-modal').style.display='none'">✕</button>
      </div>
      <div class="input-group">
        <label class="label">Registry Type</label>
        <select id="exp-type" class="input">
          <option value="internship">Professional Internship</option>
          <option value="project">Industry-Level Project</option>
        </select>
      </div>
      <div id="exp-internship-fields">
        <div class="input-group"><label class="label">Organization Name</label><input type="text" id="exp-company" class="input"></div>
        <div class="input-group"><label class="label">Designated Role</label><input type="text" id="exp-role" class="input"></div>
        <div class="grid grid-cols-2">
          <div class="input-group"><label class="label">Commencement Date</label><input type="date" id="exp-start" class="input"></div>
          <div class="input-group"><label class="label">Completion Date</label><input type="date" id="exp-end" class="input"></div>
        </div>
        <div class="input-group"><label class="label">Key Contributions</label><textarea id="exp-desc" class="input" style="height:100px; padding:12px;"></textarea></div>
      </div>
      <div id="exp-project-fields" style="display:none;">
        <div class="input-group"><label class="label">Project Title</label><input type="text" id="exp-title" class="input"></div>
        <div class="input-group"><label class="label">Tech Stack Keywords</label><input type="text" id="exp-tech" class="input"></div>
        <div class="input-group"><label class="label">Source Repository (GitHub)</label><input type="url" id="exp-git" class="input"></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="exp-cancel">Discard</button>
        <button class="btn btn-primary" id="exp-save">Commit to Profile</button>
      </div>
    </div>
  </div>
  `;
}

function renderDocCard(user, title, icon, hint) {
  const docs = user.documents || {};
  const key = title.trim().replace(/ /g, '_').toLowerCase();
  const isUploaded = !!docs[key];
  const url = docs[key];
  
  return `
  <div class="doc-card-ent" data-doc-type="${key}" style="
    background: var(--bg-surface);
    border: 1px ${isUploaded ? 'solid' : 'dashed'} ${isUploaded ? 'var(--brand-primary)' : 'rgba(255,255,255,0.1)'};
    padding: 32px 24px;
    border-radius: 20px;
    text-align: center;
    cursor: pointer;
    transition: all var(--t-standard);
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 180px;
    box-shadow: 0 10px 30px -10px rgba(0,0,0,0.5);
  ">
    <div style="font-size:32px; margin-bottom:16px; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3));">
      ${isUploaded ? '✅' : icon}
    </div>
    <div style="font-size:15px; font-weight:800; color:#fff; margin-bottom:4px;">${title}</div>
    <div style="font-size:12px; color:var(--text-description);">${isUploaded ? '<span style="color:var(--brand-secondary); font-weight:700;">Verified Node</span>' : hint}</div>
    
    ${isUploaded ? `
      <div style="margin-top:20px; display:flex; gap:8px; width:100%;">
        <a href="${url}" target="_blank" class="btn-premium-ghost" style="flex:1; font-size:11px; padding:8px;" onclick="event.stopPropagation()">View Node</a>
      </div>
    ` : ''}

    <style>
      .doc-card-ent:hover {
        transform: translateY(-4px) scale(1.02);
        border-color: var(--brand-primary);
        box-shadow: 0 20px 40px -15px rgba(0,0,0,0.6), 0 0 20px rgba(139,92,246,0.1);
        background: var(--bg-card);
      }
    </style>
  </div>`;
}

function initProfileScripts(user, Store, supabase, depts = [], pendingReq = null, activeTabId = 'tab-personal') {
  const getActiveTab = () => document.querySelector('.profile-tab.active')?.getAttribute('data-tab') || 'tab-personal';

  // Tab switching logic (Harmonized with v2.4 enterprise tabs)
  const tabBtns = document.querySelectorAll('.profile-tab');
  const contents = document.querySelectorAll('.profile-content');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-tab');
      
      tabBtns.forEach(b => b.classList.remove('active'));
      contents.forEach(c => c.style.display = 'none');

      btn.classList.add('active');
      const target = document.getElementById(targetId);
      if (target) {
        target.style.display = 'block';
        // Force a layout recalculation for grids if needed
        window.dispatchEvent(new Event('resize'));
      }
    });
  });

  // 🟢 Dynamic Topology Selector Engine
  const deptSelect = document.getElementById('a_department');
  const sectionSelect = document.getElementById('a_section');
  
  if (deptSelect && sectionSelect) {
    deptSelect.addEventListener('change', () => {
      const selectedDeptId = deptSelect.value;
      const activeDept = depts.find(d => d.id === selectedDeptId);
      
      sectionSelect.innerHTML = '<option disabled selected>Select Section...</option>';
      if (activeDept && activeDept.sections) {
        activeDept.sections.forEach(s => {
          const opt = document.createElement('option');
          opt.value = s.section_name;
          opt.textContent = `Section ${s.section_name}`;
          sectionSelect.appendChild(opt);
        });
      }
    });
  }

  // 🌍 Locality Dynamic Cascading Engine (Country -> State -> City)
  const localityData = {
    'India': {
      'Tamil Nadu': [
        'Ariyalur', 'Chengalpattu', 'Chennai', 'Coimbatore', 'Cuddalore', 'Dharmapuri', 'Dindigul', 
        'Erode', 'Kallakurichi', 'Kanchipuram', 'Kanyakumari', 'Karur', 'Krishnagiri', 'Madurai', 
        'Mayiladuthurai', 'Nagapattinam', 'Namakkal', 'Nilgiris', 'Perambalur', 'Pudukkottai', 
        'Ramanathapuram', 'Ranipet', 'Salem', 'Sivagangai', 'Sivakasi', 'Tenkasi', 'Thanjavur', 
        'Theni', 'Thoothukudi', 'Tiruchirappalli', 'Tirunelveli', 'Tirupathur', 'Tiruppur', 
        'Tiruvallur', 'Tiruvannamalai', 'Tiruvarur', 'Vellore', 'Viluppuram', 'Virudhunagar'
      ],
      'Kerala': ['Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Kollam', 'Thrissur', 'Alappuzha', 'Palakkad', 'Malappuram'],
      'Karnataka': ['Bengaluru', 'Mysuru', 'Hubballi', 'Mangaluru', 'Belagavi', 'Kalaburagi', 'Davanagere'],
      'Andhra Pradesh': ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore', 'Kurnool', 'Kakinada', 'Tirupati'],
      'Telangana': ['Hyderabad', 'Warangal', 'Nizamabad', 'Khammam', 'Karimnagar', 'Mahabubnagar'],
      'Maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Thane', 'Pimpri-Chinchwad', 'Nashik', 'Kalyan-Dombivli'],
      'Delhi': ['New Delhi', 'Dwarka', 'Rohini', 'Saket', 'Janakpuri']
    },
    'United States': {
      'California': ['Los Angeles', 'San Francisco', 'San Diego', 'San Jose'],
      'Texas': ['Houston', 'Austin', 'Dallas', 'San Antonio'],
      'New York': ['New York City', 'Buffalo', 'Rochester']
    },
    'United Kingdom': {
      'England': ['London', 'Birmingham', 'Manchester', 'Leeds'],
      'Scotland': ['Glasgow', 'Edinburgh', 'Aberdeen'],
      'Wales': ['Cardiff', 'Swansea', 'Newport']
    }
  };

  const countrySelect = document.getElementById('p_country');
  const stateSelect = document.getElementById('p_state');
  const citySelect = document.getElementById('p_city');

  if (countrySelect && stateSelect && citySelect) {
    // 1. Populate Country Dropdown
    countrySelect.innerHTML = '<option value="" disabled selected>Choose Country...</option>';
    Object.keys(localityData).forEach(c => {
      const opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c;
      countrySelect.appendChild(opt);
    });

    // 2. Helper: Populate States
    const populateStates = (selectedCountry, autoSelectValue = null) => {
      stateSelect.innerHTML = '<option value="" disabled selected>Choose State...</option>';
      citySelect.innerHTML = '<option value="" disabled selected>Choose City...</option>';
      citySelect.disabled = true;

      if (!selectedCountry || !localityData[selectedCountry]) {
        stateSelect.disabled = true;
        return;
      }

      stateSelect.disabled = false;
      const states = Object.keys(localityData[selectedCountry]);
      states.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s;
        opt.textContent = s;
        stateSelect.appendChild(opt);
      });

      // Inject dynamic fallback override
      const otherOpt = document.createElement('option');
      otherOpt.value = 'Other...';
      otherOpt.textContent = 'Other (Type manually)...';
      stateSelect.appendChild(otherOpt);

      if (autoSelectValue && states.includes(autoSelectValue)) {
        stateSelect.value = autoSelectValue;
      }
    };

    // 3. Helper: Populate Cities
    const populateCities = (selectedCountry, selectedState, autoSelectValue = null) => {
      citySelect.innerHTML = '<option value="" disabled selected>Choose City...</option>';
      if (!selectedCountry || !selectedState || !localityData[selectedCountry] || !localityData[selectedCountry][selectedState]) {
        citySelect.disabled = true;
        return;
      }

      citySelect.disabled = false;
      const cities = localityData[selectedCountry][selectedState];
      cities.forEach(city => {
        const opt = document.createElement('option');
        opt.value = city;
        opt.textContent = city;
        citySelect.appendChild(opt);
      });

      // Inject dynamic fallback override
      const otherOpt = document.createElement('option');
      otherOpt.value = 'Other...';
      otherOpt.textContent = 'Other (Type manually)...';
      citySelect.appendChild(otherOpt);

      if (autoSelectValue && cities.includes(autoSelectValue)) {
        citySelect.value = autoSelectValue;
      }
    };

    // 4. Align and Auto-Fill current DB state with fuzzy matching
    const dbCountry = Object.keys(localityData).find(c => c.toLowerCase() === (user.country || '').toLowerCase().trim());
    if (dbCountry) {
      countrySelect.value = dbCountry;
      const dbState = Object.keys(localityData[dbCountry]).find(s => s.toLowerCase().replace(/\s+/g, '') === (user.state || '').toLowerCase().replace(/\s+/g, '').trim());
      
      populateStates(dbCountry, dbState);
      
      if (dbState) {
        const dbCity = localityData[dbCountry][dbState].find(ci => ci.toLowerCase() === (user.city || '').toLowerCase().trim());
        populateCities(dbCountry, dbState, dbCity);
      }
    }

    // 5. Cascading Interactive Bindings + DOM Conversion Fallbacks
    countrySelect.addEventListener('change', (e) => {
      populateStates(e.target.value);
    });

    stateSelect.addEventListener('change', (e) => {
      if (e.target.value === 'Other...') {
        const parent = stateSelect.parentElement;
        const input = document.createElement('input');
        input.type = 'text';
        input.id = 'p_state';
        input.className = 'input-ent';
        input.placeholder = 'Type state name...';
        parent.replaceChild(input, stateSelect);
        
        // Cascade conversion to city automatically
        const cParent = citySelect.parentElement;
        const cInput = document.createElement('input');
        cInput.type = 'text';
        cInput.id = 'p_city';
        cInput.className = 'input-ent';
        cInput.placeholder = 'Type city name...';
        cParent.replaceChild(cInput, citySelect);

        input.focus();
      } else {
        populateCities(countrySelect.value, e.target.value);
      }
    });

    citySelect.addEventListener('change', (e) => {
      if (e.target.value === 'Other...') {
        const parent = citySelect.parentElement;
        const input = document.createElement('input');
        input.type = 'text';
        input.id = 'p_city';
        input.className = 'input-ent';
        input.placeholder = 'Type city name...';
        parent.replaceChild(input, citySelect);
        input.focus();
      }
    });
  }

  // 🟢 Transfer Proposal Execution Sub-system
  const trigger = document.getElementById('request-transfer-trigger');
  const panel = document.getElementById('transfer-request-panel');
  if (trigger && panel) {
    trigger.addEventListener('click', () => {
      panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
      trigger.textContent = panel.style.display === 'none' ? 'Request Transfer' : 'Discard Request';
    });
  }

  const submitTransferBtn = document.getElementById('submit-transfer-btn');
  if (submitTransferBtn) {
    submitTransferBtn.addEventListener('click', async () => {
      const targetSec = document.getElementById('t_target_section')?.value;
      const reason = document.getElementById('t_reason')?.value?.trim();
      
      if (!targetSec || targetSec.includes('Choose target')) {
        alert('Security Exception: You must select a target section node.');
        return;
      }
      
      submitTransferBtn.disabled = true;
      submitTransferBtn.textContent = 'Transmitting Proposal...';
      
      try {
        const { error } = await supabase
          .from('section_requests')
          .insert([{
            student_id: user.id,
            current_dept: user.department,
            current_section: user.section_name,
            target_dept: user.department,
            target_section: targetSec,
            reason: reason,
            status: 'Pending'
          }]);
        if (error) throw error;
        alert('Success: Transfer proposal successfully transmitted to Faculty Advisor Registry.');
        
        // Rerender profile view to show the pending banner
        loadProfilePage(document.getElementById('page-root'), Store, getActiveTab());
      } catch (err) {
        alert('Transmission Refused: ' + err.message);
        submitTransferBtn.disabled = false;
        submitTransferBtn.textContent = 'Transmit Proposal to Advisor';
      }
    });
  }

  // Save button logic (Exactly same as original)
  const saveBtn = document.getElementById('save-profile-btn');
  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      const btn = document.getElementById('save-profile-btn');
      btn.textContent = 'Saving Workspace...';
      btn.disabled = true;

      try {
        const getVal = (id) => document.getElementById(id)?.value?.trim() || null;
        const updates = {
          full_name: getVal('p_full_name'),
          register_number: getVal('p_register_number'),
          roll_number: getVal('p_roll_number'),
          gender: getVal('p_gender'),
          dob: getVal('p_dob'),
          personal_email: getVal('p_personal_email'),
          mobile_number: getVal('p_phone'),
          emergency_contact: getVal('p_emergency'),
          permanent_address: getVal('p_permanent_address'),
          current_address: getVal('p_current_address'),
          city: getVal('p_city'),
          state: getVal('p_state'),
          pincode: getVal('p_zip'),
          country: getVal('p_country'),
          linkedin_url: getVal('p_linkedin'),
          degree: getVal('a_degree'),
          department: getVal('a_department'),
          section_name: getVal('a_section'), // Captured system section identifier!
          batch_year: getVal('a_batch_year'),
          current_semester: getVal('a_current_semester'),
          cgpa: parseFloat(getVal('a_cgpa')) || null,
          technical_skills: getVal('a_technical_skills'),
          soft_skills: getVal('a_soft_skills'),
          skills: (getVal('a_technical_skills') || '').split(',').map(s => s.trim()).filter(Boolean)
        };

        const { error } = await supabase.from('profiles').upsert({ id: user.id, ...updates });
        if (error) throw error;
        Store.session.user = { ...Store.session.user, ...updates };
        
        // Refresh view for state alignment
        alert('Profile successfully committed to the enterprise registry.');
        loadProfilePage(document.getElementById('page-root'), Store, getActiveTab());
      } catch (err) {
        alert('Commit failed: ' + err.message);
      } finally {
        btn.textContent = 'Save Profile Identity';
        btn.disabled = false;
      }
    });
  }

  // Re-attach other original logic (Experience, Documents)
  let fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.style.display = 'none';
  document.body.appendChild(fileInput);
  let currentDocType = '';

  document.querySelectorAll('.doc-card-ent').forEach(card => {
    card.addEventListener('click', () => {
      currentDocType = card.getAttribute('data-doc-type');
      fileInput.click();
    });
  });

  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const docType = currentDocType;
    try {
      const fileName = `${user.id}/${docType}_${Date.now()}.${file.name.split('.').pop()}`;
      await supabase.storage.from('student-documents').upload(fileName, file);
      const { data: { publicUrl } } = supabase.storage.from('student-documents').getPublicUrl(fileName);
      const docs = user.documents || {};
      docs[docType] = publicUrl;
      await supabase.from('profiles').upsert({ id: user.id, documents: docs });
      Store.session.user.documents = docs;
      alert('Document verified and uploaded.');
      loadProfilePage(document.getElementById('page-root'), Store, getActiveTab());
    } catch (err) { alert('Upload failed: ' + err.message); }
  });

  // Modal logic
  const expModal = document.getElementById('exp-modal');
  const addExpBtn = document.getElementById('add-exp-btn');
  const expCancelBtn = document.getElementById('exp-cancel');
  const expTypeSelect = document.getElementById('exp-type');
  const expSaveBtn = document.getElementById('exp-save');

  if (addExpBtn && expModal) {
    addExpBtn.onclick = () => expModal.style.display='flex';
  }
  if (expCancelBtn && expModal) {
    expCancelBtn.onclick = () => expModal.style.display='none';
  }
  if (expTypeSelect) {
    expTypeSelect.onchange = (e) => {
      const intFields = document.getElementById('exp-internship-fields');
      const prjFields = document.getElementById('exp-project-fields');
      if (intFields) intFields.style.display = e.target.value==='internship'?'block':'none';
      if (prjFields) prjFields.style.display = e.target.value==='project'?'block':'none';
    };
  }

  if (expSaveBtn) {
    expSaveBtn.onclick = async () => {
      const type = document.getElementById('exp-type')?.value;
      try {
        if (type === 'internship') {
          await supabase.from('internships').insert({
            student_id: user.id,
            company: document.getElementById('exp-company')?.value,
            role: document.getElementById('exp-role')?.value,
            start_date: document.getElementById('exp-start')?.value,
            end_date: document.getElementById('exp-end')?.value,
            description: document.getElementById('exp-desc')?.value
          });
        } else {
          await supabase.from('projects').insert({
            student_id: user.id,
            title: document.getElementById('exp-title')?.value,
            tech_stack: document.getElementById('exp-tech')?.value?.split(','),
            github_url: document.getElementById('exp-git')?.value
          });
        }
        if (expModal) expModal.style.display='none';
        alert('Experience committed.');
        loadExperiences();
      } catch (err) { alert('Error: ' + err.message); }
    };
  }

  async function loadExperiences() {
    const list = document.getElementById('experience-list');
    const { data: ints } = await supabase.from('internships').select('*').eq('student_id', user.id);
    const { data: projs } = await supabase.from('projects').select('*').eq('student_id', user.id);
    let html = '';
    [...(ints||[]), ...(projs||[])].forEach(i => {
      html += `<div class="card" style="padding:12px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
        <div>
          <div style="font-size:13px; font-weight:700; color:var(--text-main);">${i.role || i.title}</div>
          <div style="font-size:11px; color:var(--text-muted);">${i.company || 'Project'}</div>
        </div>
        <span class="status-pill status-success" style="font-size:10px;">Verified</span>
      </div>`;
    });
    list.innerHTML = html || '<div style="color:var(--text-muted);font-size:12px;text-align:center;">No industry experience logged.</div>';
  }
  loadExperiences();
}
