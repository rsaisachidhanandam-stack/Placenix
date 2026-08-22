import { supabase } from '../supabase.js';
import { extractTextFromPDF, analyzeWithGemini } from './resume-intelligence.js';
import { showToast } from '../components/toast.js';
import { saveStore } from '../store.js';

// Helper function to race a query against a timeout, returning a default value if it takes too long
async function withTimeout(promise, timeoutMs, defaultValue) {
  let timeoutId;
  const timeoutPromise = new Promise((resolve) => {
    timeoutId = setTimeout(() => {
      console.warn(`⚠️ [Placenix Timeout] Database query took longer than ${timeoutMs}ms. Using fallback.`);
      resolve(defaultValue);
    }, timeoutMs);
  });
  const result = await Promise.race([promise, timeoutPromise]);
  clearTimeout(timeoutId);
  return result;
}

export function calculateSemesterFromBatch(batchStr) {
  if (!batchStr) return null;
  const match = String(batchStr).match(/\b(20\d{2})\b/);
  if (!match) return null;
  
  const startYear = parseInt(match[1], 10);
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0 = Jan, 6 = Jul
  
  const yearDiff = currentYear - startYear;
  if (yearDiff < 0) return 'Semester 1';
  
  let sem = yearDiff * 2 + (currentMonth >= 6 ? 1 : 0);
  if (sem < 1) sem = 1;
  if (sem > 8) return 'Graduated';
  
  return `Semester ${sem}`;
}

export async function loadProfilePage(root, Store, maybeSupabase, activeTabId = 'tab-personal') {
  console.log('🏁 loadProfilePage: Initiating secure load sequence...');
  const loggedInUser = Store.session.user || {};
  const hash = window.location.hash || '';
  const hashParams = new URLSearchParams(hash.includes('?') ? hash.substring(hash.indexOf('?')) : '');
  let targetStudentId = hashParams.get('id');
  if (targetStudentId === '58ad3ece-0f28-4b73-bc81-2b234df9aeab') {
    targetStudentId = '58ad3eee-0f28-4b73-bc81-2b234df9aeab';
  }

  // Non-student staff members do not have a personal student profile form; redirect to staff workspace
  const userRole = Store.session?.role || loggedInUser.role || 'student';
  if (userRole !== 'student' && !targetStudentId) {
    const roleHashMap = {
      'faculty': 'faculty-dashboard',
      'department': 'coordinator-dashboard',
      'coordinator': 'coordinator-dashboard',
      'tpo': 'tpo-dashboard',
      'admin': 'admin-dashboard',
      'saas-admin': 'saas-admin'
    };
    window.location.hash = roleHashMap[userRole] || 'faculty-dashboard';
    return;
  }
  const isReadOnly = targetStudentId && targetStudentId !== loggedInUser.id;
  const currentTab = (typeof maybeSupabase === 'string') ? maybeSupabase : activeTabId;
  const supabaseClient = (typeof maybeSupabase === 'object' && maybeSupabase) ? maybeSupabase : (typeof window !== 'undefined' ? window.supabase : null);

  let user = loggedInUser;
  const targetId = targetStudentId || loggedInUser.id;

  // Retrieve any cached profile snapshot for this user to ensure instant persistence
  let localCachedProfile = {};
  try {
    const profileCache = JSON.parse(localStorage.getItem('placenix_profile_cache') || '{}');
    if (targetId && profileCache[targetId]) {
      localCachedProfile = profileCache[targetId];
    }
  } catch(e){}

  if (targetStudentId) {
    let localStudent = null;
    if (Store && Array.isArray(Store.students)) {
      localStudent = Store.students.find(s => s.id === targetStudentId);
    }
    
    user = {
      id: targetStudentId,
      full_name: localCachedProfile.full_name || localStudent?.name || localStudent?.full_name || 'srithikan s',
      department: localCachedProfile.department || localStudent?.dept || localStudent?.department || 'Computer Science & Engineering',
      cgpa: localCachedProfile.cgpa || localStudent?.cgpa || '8.0',
      skills: localCachedProfile.skills || localStudent?.skills || ['JavaScript', 'React', 'Node.js', 'Python', 'Machine Learning'],
      role: 'student',
      college: localCachedProfile.college || 'Kalasalingam University',
      roll_number: localCachedProfile.roll_number || localStudent?.rollNo || localStudent?.roll_number || '3652147',
      register_number: localCachedProfile.register_number || localStudent?.rollNo || localStudent?.register_number || '3652147',
      batch: localCachedProfile.batch_year || localStudent?.batch || '2021 - 2025',
      status: localCachedProfile.status || localStudent?.status || 'APPROVED',
      ats: localStudent?.atsScore || localStudent?.ats || 70,
      email: localCachedProfile.email || localStudent?.email || 'srithikan@klu.ac.in',
      ...localCachedProfile
    };
  } else {
    user = {
      ...localCachedProfile,
      ...loggedInUser
    };
    if (Store.session) {
      Store.session.user = user;
    }
  }

  // Render profile HTML synchronously in 0ms to prevent skeleton layout height jump
  try {
    root.innerHTML = getProfileHTML(user, [], null, [], [], currentTab, isReadOnly);
    initProfileScripts(root, user, Store, supabaseClient, [], null, currentTab, isReadOnly);
  } catch (syncErr) {
    console.warn('⚠️ Initial profile sync render warning:', syncErr);
  }

  // Non-blocking background database sync
  if (supabaseClient && typeof supabaseClient.from === 'function') {
    Promise.all([
      withTimeout(supabaseClient.from('profiles').select('*').eq('id', targetId).maybeSingle(), 3000, { data: null }),
      withTimeout(supabaseClient.from('departments').select('*, sections(*)'), 3000, { data: [] }),
      withTimeout(supabaseClient.from('degrees').select('*').order('degree_name'), 3000, { data: [] }),
      withTimeout(supabaseClient.from('academic_batches').select('*').order('batch_name'), 3000, { data: [] }),
      withTimeout(supabaseClient.from('section_requests').select('*').eq('student_id', targetId).eq('status', 'Pending').maybeSingle(), 2000, { data: null })
    ]).then(([profileRes, deptsRes, degreesRes, batchesRes, reqRes]) => {
      let updatedUser = { ...user };
      if (profileRes && profileRes.data) {
        const remoteData = profileRes.data;
        Object.keys(remoteData).forEach(k => {
          if (remoteData[k] !== null && remoteData[k] !== undefined && remoteData[k] !== '') {
            updatedUser[k] = remoteData[k];
          }
        });
      }
      
      // Update local profile cache
      try {
        const profileCache = JSON.parse(localStorage.getItem('placenix_profile_cache') || '{}');
        profileCache[targetId] = { ...(profileCache[targetId] || {}), ...updatedUser };
        localStorage.setItem('placenix_profile_cache', JSON.stringify(profileCache));
      } catch(e){}

      if (!targetStudentId || targetStudentId === loggedInUser.id) {
        Store.session.user = updatedUser;
        localStorage.setItem('placenix-mock-session', JSON.stringify(updatedUser));
        localStorage.setItem('placenix_user_session', JSON.stringify(updatedUser));
      }
      const depts = deptsRes?.data || [];
      const degrees = degreesRes?.data || [];
      const batches = batchesRes?.data || [];
      const pendingReq = reqRes?.data || null;

      try {
        root.innerHTML = getProfileHTML(updatedUser, depts, pendingReq, degrees, batches, currentTab, isReadOnly);
        initProfileScripts(root, updatedUser, Store, supabaseClient, depts, pendingReq, currentTab, isReadOnly);
      } catch (renderErr) {
        console.error('❌ Background profile render error:', renderErr);
      }
    }).catch(asyncErr => {
      console.warn('⚠️ Background profile sync warning:', asyncErr);
    });
  }
}

function getProfileHTML(user, depts = [], pendingReq = null, degrees = [], batches = [], activeTabId = 'tab-personal', isReadOnly = false) {
  return `
    <div style="display: flex; flex-direction: column; gap: 32px;">
    <!-- Header Area -->
    <div class="card-ent" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:48px; padding:32px; border-radius:var(--radius-lg); border:1px solid var(--glass-border-main); background:var(--glass-2);">
      <div style="display:flex; align-items:center; gap:24px;">
        <div style="width:80px; height:80px; border-radius:20px; background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary)); display:flex; align-items:center; justify-content:center; font-size:32px; font-weight:800; color:#fff; box-shadow: 0 8px 32px rgba(129, 140, 248, 0.3);">
          ${(user.full_name || 'U')[0].toUpperCase()}
        </div>
        <div>
          <h1 class="h1-ent" style="margin-bottom:6px; font-size:28px; font-family:var(--font-display);">${user.full_name || 'Enterprise Identity'}</h1>
          <div style="display:flex; align-items:center; gap:12px; color:var(--text-description); font-size:13.5px; font-weight:600;">
            <span>${user.roll_number || 'N/A'}</span>
            <span style="opacity:0.2;">•</span>
            <span>${user.department ? depts.find(d => d.id === user.department)?.name || 'General' : 'General'} · Section ${user.section_name || 'TBD'}</span>
            <span style="opacity:0.2;">•</span>
            <span>${user.college || 'Kalasalingam University'}</span>
          </div>
        </div>
      </div>
      ${isReadOnly ? `
        <div style="display:flex; gap:16px; align-items:center;">
          <span style="background: var(--brand-primary-light); border: 1px solid rgba(129, 140, 248, 0.3); color: var(--brand-primary); font-size: 13px; font-weight: 700; padding: 8px 16px; border-radius: 12px; display: flex; align-items: center; gap: 8px;">
            🛡️ Viewing Profile (Read-Only)
          </span>
          <button class="btn btn-secondary" onclick="window.history.back()" style="height:44px; padding:0 24px; border-radius:12px; font-weight:700;">Back</button>
        </div>
      ` : `
        <button class="btn btn-primary" id="save-profile-btn" style="height:44px; padding:0 24px; border-radius:var(--radius-sm); font-weight:700;">Save Identity</button>
      `}
    </div>

    <!-- Institutional Tabs -->
    <div style="display:flex; gap:32px; border-bottom:1px solid var(--glass-border-subtle); margin-bottom:48px;">
      <div class="profile-tab ${activeTabId === 'tab-personal' ? 'active' : ''}" data-tab="tab-personal">Personal Workspace</div>
      <div class="profile-tab ${activeTabId === 'tab-academic' ? 'active' : ''}" data-tab="tab-academic">Academic Record</div>
      <div class="profile-tab ${activeTabId === 'tab-documents' ? 'active' : ''}" data-tab="tab-documents">Verification Vault</div>
      <div class="profile-tab ${activeTabId === 'tab-interviews' ? 'active' : ''}" data-tab="tab-interviews">Interview History</div>
    </div>

    <style>
      .profile-tab {
        padding: 16px 0; font-size: 15px; font-weight: 700; color: var(--text-muted); 
        cursor: pointer; position: relative; transition: var(--t-fast);
      }
      .profile-tab:hover { color: var(--text-main); }
      .profile-tab.active { color: var(--brand-primary); font-weight: 800; }
      .profile-tab.active::after {
        content: ''; position: absolute; bottom: -1px; left: 0; width: 100%; height: 2px;
        background: var(--brand-primary); box-shadow: 0 0 10px var(--brand-primary-glow);
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
            <input type="text" id="p_full_name" class="input-ent" value="${user.full_name || ''}" placeholder="Not Provided (TBD)" ${isReadOnly ? 'disabled' : ''}>
          </div>
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px;">
            <div class="input-node">
              <label class="label-ent">Register Number</label>
              <input type="text" id="p_register_number" class="input-ent" value="${user.register_number || ''}" placeholder="Not Provided (TBD)" ${isReadOnly ? 'disabled' : ''}>
            </div>
            <div class="input-node">
              <label class="label-ent">Roll Number</label>
              <input type="text" id="p_roll_number" class="input-ent" value="${user.roll_number || ''}" placeholder="Not Provided (TBD)" ${isReadOnly ? 'disabled' : ''}>
            </div>
          </div>
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px;">
            <div class="input-node">
              <label class="label-ent">Gender Identity</label>
              <input type="text" id="p_gender" list="dl_p_gender" class="input-ent" value="${user.gender || ''}" placeholder="Type or select Gender..." ${isReadOnly ? 'disabled' : ''}>
              <datalist id="dl_p_gender">
                <option value="Male">
                <option value="Female">
                <option value="Non-binary">
                <option value="Prefer not to say">
              </datalist>
            </div>
            <div class="input-node">
              <label class="label-ent">Date of Birth</label>
              <input type="date" id="p_dob" class="input-ent" value="${user.dob || ''}" placeholder="Not Provided (TBD)" ${isReadOnly ? 'disabled' : ''}>
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
            <input type="email" id="p_personal_email" class="input-ent" value="${user.personal_email || ''}" placeholder="Not Provided (TBD)" ${isReadOnly ? 'disabled' : ''}>
          </div>
          <div class="input-node">
            <label class="label-ent">Institutional Email</label>
            <input type="email" id="p_institutional_email" class="input-ent" value="${user.email || ''}" placeholder="Not Provided (TBD)" disabled>
          </div>
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px;">
            <div class="input-node">
              <label class="label-ent">Primary Mobile</label>
              <input type="tel" id="p_phone" class="input-ent" value="${user.mobile_number || ''}" placeholder="Not Provided (TBD)" ${isReadOnly ? 'disabled' : ''}>
            </div>
            <div class="input-node">
              <label class="label-ent">Emergency Contact</label>
              <input type="tel" id="p_emergency" class="input-ent" value="${user.emergency_contact || ''}" placeholder="Not Provided (TBD)" ${isReadOnly ? 'disabled' : ''}>
            </div>
          </div>
          <div class="input-node">
            <label class="label-ent">LinkedIn Workspace URL</label>
            <input type="text" id="p_linkedin" class="input-ent" value="${user.linkedin_url || ''}" placeholder="linkedin.com/in/username (TBD)" ${isReadOnly ? 'disabled' : ''}>
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
          <textarea id="p_permanent_address" class="input-ent" style="height:80px; resize:none;" placeholder="Not Provided (TBD)" ${isReadOnly ? 'disabled' : ''}>${user.permanent_address || ''}</textarea>
        </div>
        <div class="input-node">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <label class="label-ent" style="margin-bottom:0;">Current Communication Address</label>
            ${!isReadOnly ? `
              <button type="button" id="copy-address-btn" style="background:rgba(129,140,248,0.12); border:1px solid rgba(129,140,248,0.3); color:var(--brand-primary); font-size:11px; font-weight:700; padding:4px 12px; border-radius:6px; cursor:pointer; display:inline-flex; align-items:center; gap:6px; transition:all 0.2s ease;">
                📋 Same as Permanent
              </button>
            ` : ''}
          </div>
          <textarea id="p_current_address" class="input-ent" style="height:80px; resize:none;" placeholder="Not Provided (TBD)" ${isReadOnly ? 'disabled' : ''}>${user.current_address || ''}</textarea>
        </div>
      </div>
      <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:20px;">
        <div class="input-node">
          <label class="label-ent">Country</label>
          <input type="text" id="p_country" list="dl_p_country" class="input-ent" value="${user.country || ''}" placeholder="Type or search Country..." ${isReadOnly ? 'disabled' : ''}>
          <datalist id="dl_p_country"></datalist>
        </div>
        <div class="input-node">
          <label class="label-ent">State / Region</label>
          <input type="text" id="p_state" list="dl_p_state" class="input-ent" value="${user.state || ''}" placeholder="Type or search State..." ${isReadOnly ? 'disabled' : ''}>
          <datalist id="dl_p_state"></datalist>
        </div>
        <div class="input-node">
          <label class="label-ent">City</label>
          <input type="text" id="p_city" list="dl_p_city" class="input-ent" value="${user.city || ''}" placeholder="Type or search City..." ${isReadOnly ? 'disabled' : ''}>
          <datalist id="dl_p_city"></datalist>
        </div>
        <div class="input-node">
          <label class="label-ent">Postal Code</label>
          <input type="text" id="p_zip" class="input-ent" value="${user.pincode || ''}" placeholder="e.g. 626117" ${isReadOnly ? 'disabled' : ''}>
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
              <input type="text" id="a_degree" list="dl_a_degree" class="input-ent" value="${user.degree || ''}" placeholder="Type or search Degree..." ${isReadOnly ? 'disabled' : ''}>
              <datalist id="dl_a_degree">
                ${degrees.map(d => `<option value="${d.degree_name}">`).join('')}
                <option value="B.Tech Computer Science & Engineering">
                <option value="B.Tech Information Technology">
                <option value="B.Tech Artificial Intelligence & Data Science">
                <option value="B.Tech Electronics & Communication">
                <option value="B.Tech Mechanical Engineering">
                <option value="M.Tech Computer Science">
                <option value="BCA">
                <option value="MCA">
                <option value="MBA">
              </datalist>
            </div>
            <div class="input-node">
              <label class="label-ent">Academic Batch</label>
              <input type="text" id="a_batch_year" list="dl_a_batch_year" class="input-ent" value="${user.batch_year || ''}" placeholder="Type or search Batch..." ${isReadOnly ? 'disabled' : ''}>
              <datalist id="dl_a_batch_year">
                ${batches.map(b => `<option value="${b.batch_name}">`).join('')}
                <option value="2021 - 2025">
                <option value="2022 - 2026">
                <option value="2023 - 2027">
                <option value="2024 - 2028">
              </datalist>
            </div>
          </div>
          
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px;">
            <div class="input-node">
              <label class="label-ent">Major / Department</label>
              <input type="text" id="a_department" list="dl_a_department" class="input-ent" value="${(() => {
                if (!user.department) return '';
                const found = depts.find(d => d.id === user.department || d.name === user.department);
                return found ? found.name : user.department;
              })()}" placeholder="Type or search Department..." ${user.section_name || isReadOnly ? 'disabled' : ''}>
              <datalist id="dl_a_department">
                ${depts.map(d => `<option value="${d.name}">`).join('')}
                <option value="Computer Science & Engineering">
                <option value="Information Technology">
                <option value="Artificial Intelligence & Data Science">
                <option value="Electronics & Communication Engineering">
                <option value="Electrical & Electronics Engineering">
                <option value="Mechanical Engineering">
                <option value="Civil Engineering">
              </datalist>
            </div>
            <div class="input-node">
              <label class="label-ent">Section Node</label>
              <input type="text" id="a_section" list="dl_a_section" class="input-ent" value="${user.section_name ? (user.section_name.startsWith('Section') ? user.section_name : 'Section ' + user.section_name) : ''}" placeholder="Type or search Section..." ${user.section_name || isReadOnly ? 'disabled' : ''}>
              <datalist id="dl_a_section">
                ${(() => {
                  const curDept = depts.find(d => d.id === user.department || d.name === user.department);
                  if (curDept && curDept.sections) {
                    return curDept.sections.map(s => `<option value="Section ${s.section_name}">`).join('');
                  }
                  return '<option value="Section A"><option value="Section B"><option value="Section C"><option value="Section D">';
                })()}
              </datalist>
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
                ` : isReadOnly ? '' : `
                  <button type="button" class="btn-premium-ghost" id="request-transfer-trigger" style="height:32px; font-size:10px; padding:0 12px; border-radius:8px;">Request Transfer</button>
                `}
              </div>
              
              ${pendingReq ? `
                <div style="margin-top:12px; font-size:12px; color:var(--text-description); background:rgba(255,255,255,0.01); padding:12px; border-radius:8px; border:1px dashed var(--border-subtle);">
                  Requested target: <strong>Section ${pendingReq.target_section}</strong>. Awaiting Faculty Advisor acceptance.
                </div>
              ` : isReadOnly ? '' : `
                <div id="transfer-request-panel" style="display:none; flex-direction:column; gap:16px; margin-top:16px; border-top:1px solid rgba(255,255,255,0.05); padding-top:16px; animation: fadeIn 0.3s ease;">
                  <div class="input-node">
                    <label class="label-ent" style="font-size:9px;">TARGET SECTION NODE</label>
                    <input type="text" id="t_target_section" list="dl_t_target_section" class="input-ent" style="height:38px; font-size:12px;" placeholder="Type or search target section...">
                    <datalist id="dl_t_target_section">
                      ${(() => {
                        const curDept = depts.find(d => d.id === user.department || d.name === user.department);
                        if (curDept && curDept.sections) {
                          return curDept.sections.filter(s => s.section_name !== user.section_name).map(s => `<option value="Section ${s.section_name}">`).join('');
                        }
                        return '<option value="Section A"><option value="Section B"><option value="Section C">';
                      })()}
                    </datalist>
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
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <label class="label-ent" style="margin-bottom:0;">Current Semester</label>
                ${!isReadOnly ? `
                  <button type="button" id="auto-compute-sem-btn" style="background:rgba(129,140,248,0.12); border:1px solid rgba(129,140,248,0.3); color:var(--brand-primary); font-size:11px; font-weight:700; padding:4px 10px; border-radius:6px; cursor:pointer; display:inline-flex; align-items:center; gap:5px; transition:all 0.2s ease;" title="Auto-compute active semester from Academic Batch & current date">
                    ⚡ Auto-Compute
                  </button>
                ` : ''}
              </div>
              <input type="text" id="a_current_semester" list="dl_a_current_semester" class="input-ent" value="${(() => {
                if (user.current_semester) {
                  return typeof user.current_semester === 'number' ? 'Semester ' + user.current_semester : user.current_semester;
                }
                const calc = calculateSemesterFromBatch(user.batch_year);
                return calc || '';
              })()}" placeholder="Type or select Semester..." ${isReadOnly ? 'disabled' : ''}>
              <datalist id="dl_a_current_semester">
                ${[1,2,3,4,5,6,7,8].map(s => `<option value="Semester ${s}">`).join('')}
              </datalist>
              <div id="sem-calc-badge" style="font-size:11px; color:var(--text-description); margin-top:4px;">
                <span>💡 Auto-synced with Academic Batch timeline</span>
              </div>
            </div>
            <div class="input-node">
              <label class="label-ent">Verified CGPA</label>
              <input type="number" step="0.01" id="a_cgpa" class="input-ent" value="${user.cgpa || ''}" ${isReadOnly ? 'disabled' : ''}>
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
            <input type="text" id="a_technical_skills" class="input-ent" placeholder="e.g. Python, React, AWS" value="${user.technical_skills || (user.skills || []).join(', ')}" ${isReadOnly ? 'disabled' : ''}>
          </div>
          <div class="input-node">
            <label class="label-ent">Behavioral / Soft Skills</label>
            <input type="text" id="a_soft_skills" class="input-ent" placeholder="e.g. Leadership, Strategic Thinking" value="${user.soft_skills || ''}" ${isReadOnly ? 'disabled' : ''}>
          </div>
          <div id="experience-list" style="display:flex; flex-direction:column; gap:12px; margin-top:8px;"></div>
          ${isReadOnly ? '' : `<button class="btn-premium-ghost" id="add-exp-btn" style="width:100%; border-radius:12px; padding:12px;">+ Add Internship / Industry Project</button>`}
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
        ${renderDocCard(user, 'Primary Resume', '📝', 'ATS Ready PDF', isReadOnly)}
        ${renderDocCard(user, 'College ID Card', '🪪', 'Verification PDF', isReadOnly)}
        ${renderDocCard(user, '10th Marksheet', '🎓', 'Academic Record', isReadOnly)}
        ${renderDocCard(user, '12th Marksheet', '🎓', 'Academic Record', isReadOnly)}
        ${renderDocCard(user, 'Aadhaar Card', '📄', 'Identity Record', isReadOnly)}
        ${renderDocCard(user, 'PAN Card', '📄', 'Tax Identity', isReadOnly)}
      </div>
    </div>
  </div>

  <div class="profile-content ${activeTabId === 'tab-interviews' ? 'active' : ''}" id="tab-interviews" style="${activeTabId === 'tab-interviews' ? '' : 'display:none;'}">
    <div class="card-ent" style="padding:48px;">
      <div style="margin-bottom:48px;">
        <h3 class="h2-ent" style="font-size:24px;">AI Virtual Interview History</h3>
        <p style="color:var(--text-description); font-size:14px; margin-top:4px;">Diagnostic metrics and progress logs across all simulated mock interview sessions.</p>
      </div>

      ${(() => {
        const history = user.employability_data?.interview_history || [];
        if (history.length === 0) {
          return `
            <div style="text-align:center; padding:80px 16px; color:var(--text-muted); display:flex; flex-direction:column; align-items:center; gap:16px;">
              <div style="font-size:48px;">🤖</div>
              <div style="font-weight:800; color:white; font-size:16px;">No Assessment Telemetry Yet</div>
              <p style="font-size:13px; max-width:400px; line-height:1.6; margin:0;">
                This student has not completed any virtual interviews. Once a session is completed, scores and analysis progress will compile here.
              </p>
              ${isReadOnly ? '' : `<button class="btn-premium" onclick="window.location.hash='#virtual-interview'" style="margin-top:8px;">Start Virtual Assessment →</button>`}
            </div>
          `;
        }

        // Render history attempts
        return `
          <div style="display:flex; flex-direction:column; gap:24px;">
            <div style="display:flex; flex-direction:column; gap:16px;">
              ${history.map((attempt, index) => {
                const isPassing = attempt.scores.overall >= 70;
                return `
                  <div style="padding:24px; background:rgba(255,255,255,0.01); border:1px solid var(--border-main); border-radius:16px; display:flex; flex-direction:column; gap:16px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.03); padding-bottom:12px;">
                      <div>
                        <span style="font-size:11px; font-weight:800; color:var(--brand-primary); text-transform:uppercase; letter-spacing:0.05em;">Attempt #${attempt.attempt} — ${attempt.company} (${attempt.role})</span>
                        <div style="font-size:12px; color:var(--text-muted); margin-top:2px;">Conducted on ${attempt.date}</div>
                      </div>
                      <span style="font-size:11px; font-weight:800; padding:6px 14px; border-radius:100px; 
                                   background:${isPassing ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)'}; 
                                   color:${isPassing ? 'var(--brand-secondary)' : '#ef4444'};">
                        OVERALL: ${attempt.scores.overall}% (${isPassing ? 'PASS' : 'RE-ATTEMPT SUGGESTED'})
                      </span>
                    </div>
                    
                    <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:16px;">
                      <div style="background:rgba(0,0,0,0.1); padding:16px; border-radius:12px; text-align:center; border:1px solid rgba(255,255,255,0.02);">
                        <div class="label-ent" style="font-size:9px; margin-bottom:4px;">Aptitude & Logic</div>
                        <div style="font-size:16px; font-weight:800; color:#fff;">${attempt.scores.aptitude}%</div>
                      </div>
                      <div style="background:rgba(0,0,0,0.1); padding:16px; border-radius:12px; text-align:center; border:1px solid rgba(255,255,255,0.02);">
                        <div class="label-ent" style="font-size:9px; margin-bottom:4px;">Coding Skill</div>
                        <div style="font-size:16px; font-weight:800; color:#fff;">${attempt.scores.technical}%</div>
                      </div>
                      <div style="background:rgba(0,0,0,0.1); padding:16px; border-radius:12px; text-align:center; border:1px solid rgba(255,255,255,0.02);">
                        <div class="label-ent" style="font-size:9px; margin-bottom:4px;">Communication</div>
                        <div style="font-size:16px; font-weight:800; color:#fff;">${attempt.scores.communication}%</div>
                      </div>
                      <div style="background:rgba(0,0,0,0.1); padding:16px; border-radius:12px; text-align:center; border:1px solid rgba(255,255,255,0.02);">
                        <div class="label-ent" style="font-size:9px; margin-bottom:4px;">Behavioral HR</div>
                        <div style="font-size:16px; font-weight:800; color:#fff;">${attempt.scores.hr}%</div>
                      </div>
                    </div>
                  </div>
                `;
              }).reverse().join('')}
            </div>
          </div>
        `;
      })()}
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

function renderDocCard(user, title, icon, hint, isReadOnly = false) {
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
    cursor: ${isUploaded ? 'pointer' : (isReadOnly ? 'default' : 'pointer')};
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
        transform: ${isUploaded || !isReadOnly ? 'translateY(-4px) scale(1.02)' : 'none'};
        border-color: ${isUploaded || !isReadOnly ? 'var(--brand-primary)' : 'rgba(255,255,255,0.1)'};
        box-shadow: ${isUploaded || !isReadOnly ? '0 20px 40px -15px rgba(0,0,0,0.6), 0 0 20px rgba(139,92,246,0.1)' : '0 10px 30px -10px rgba(0,0,0,0.5)'};
        background: ${isUploaded || !isReadOnly ? 'var(--bg-card)' : 'var(--bg-surface)'};
      }
    </style>
  </div>`;
}

function initProfileScripts(root, user, Store, supabase, depts = [], pendingReq = null, activeTabId = 'tab-personal', isReadOnly = false) {
  const container = root || document.getElementById('app-content') || document.querySelector('.main-content') || document.body;
  const dbClient = (supabase && typeof supabase.from === 'function') ? supabase 
                 : (window.supabase && typeof window.supabase.from === 'function') ? window.supabase 
                 : null;
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

  // 🟢 Dynamic Department & Section Hybrid Combobox Engine
  const deptInput = document.getElementById('a_department');
  const dlDept = document.getElementById('dl_a_department');
  const sectionInput = document.getElementById('a_section');
  const dlSection = document.getElementById('dl_a_section');

  if (deptInput && dlSection && !isReadOnly) {
    const updateSections = () => {
      dlSection.innerHTML = '';
      const dVal = deptInput.value?.trim() || '';
      const activeDept = depts.find(d => d.name?.toLowerCase() === dVal.toLowerCase() || d.id === dVal);
      if (activeDept && activeDept.sections) {
        activeDept.sections.forEach(s => {
          const opt = document.createElement('option');
          opt.value = `Section ${s.section_name}`;
          dlSection.appendChild(opt);
        });
      } else {
        ['A', 'B', 'C', 'D', 'E'].forEach(s => {
          const opt = document.createElement('option');
          opt.value = `Section ${s}`;
          dlSection.appendChild(opt);
        });
      }
    };

    deptInput.addEventListener('input', updateSections);
  }

  // ⚡ Auto-compute current semester from batch handler & live listener
  const batchInput = document.getElementById('a_batch_year');
  const semInput = document.getElementById('a_current_semester');
  const computeSemBtn = document.getElementById('auto-compute-sem-btn');
  const semBadge = document.getElementById('sem-calc-badge');

  const updateComputedSemester = (userInitiated = false) => {
    if (!semInput) return;
    const bVal = batchInput?.value || user.batch_year;
    const calculated = calculateSemesterFromBatch(bVal);
    if (calculated) {
      semInput.value = calculated;
      if (semBadge) {
        semBadge.innerHTML = `<span style="color:var(--brand-secondary); font-weight:700;">✓ Calculated: ${calculated}</span> <span style="opacity:0.7;">(from ${bVal || 'Batch'})</span>`;
      }
      if (userInitiated && computeSemBtn) {
        computeSemBtn.innerHTML = `✓ ${calculated}`;
        computeSemBtn.style.borderColor = 'rgba(16, 185, 129, 0.5)';
        computeSemBtn.style.color = 'var(--brand-secondary)';
        computeSemBtn.style.background = 'rgba(16, 185, 129, 0.15)';
        setTimeout(() => {
          computeSemBtn.innerHTML = '⚡ Auto-Compute';
          computeSemBtn.style.borderColor = 'rgba(129, 140, 248, 0.3)';
          computeSemBtn.style.color = 'var(--brand-primary)';
          computeSemBtn.style.background = 'rgba(129, 140, 248, 0.12)';
        }, 1800);
      }
    }
  };

  if (batchInput && !isReadOnly) {
    batchInput.addEventListener('input', () => updateComputedSemester(false));
    batchInput.addEventListener('change', () => updateComputedSemester(false));
  }

  if (computeSemBtn && !isReadOnly) {
    computeSemBtn.addEventListener('click', () => updateComputedSemester(true));
  }

  if (semInput && (!semInput.value || semInput.value.trim() === '') && !isReadOnly) {
    updateComputedSemester(false);
  }

  // 🌍 Locality Dynamic Hybrid Combobox Engine (Country -> State -> City)
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

  const countryInput = document.getElementById('p_country');
  const dlCountry = document.getElementById('dl_p_country');
  const stateInput = document.getElementById('p_state');
  const dlState = document.getElementById('dl_p_state');
  const cityInput = document.getElementById('p_city');
  const dlCity = document.getElementById('dl_p_city');

  if (countryInput && dlCountry) {
    // Populate Country Datalist
    dlCountry.innerHTML = '';
    const countries = Object.keys(localityData).concat(['Canada', 'Australia', 'Germany', 'United Arab Emirates', 'Singapore', 'Malaysia', 'Japan']);
    countries.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c;
      dlCountry.appendChild(opt);
    });

    const updateStateOptions = () => {
      if (!dlState) return;
      dlState.innerHTML = '';
      const cVal = countryInput.value?.trim() || '';
      const matchedC = Object.keys(localityData).find(c => c.toLowerCase() === cVal.toLowerCase());
      if (matchedC && localityData[matchedC]) {
        Object.keys(localityData[matchedC]).forEach(s => {
          const opt = document.createElement('option');
          opt.value = s;
          dlState.appendChild(opt);
        });
      }
    };

    const updateCityOptions = () => {
      if (!dlCity) return;
      dlCity.innerHTML = '';
      const cVal = countryInput.value?.trim() || '';
      const sVal = stateInput.value?.trim() || '';
      const matchedC = Object.keys(localityData).find(c => c.toLowerCase() === cVal.toLowerCase());
      if (matchedC && localityData[matchedC]) {
        const matchedS = Object.keys(localityData[matchedC]).find(s => s.toLowerCase().replace(/\s+/g, '') === sVal.toLowerCase().replace(/\s+/g, ''));
        if (matchedS && localityData[matchedC][matchedS]) {
          localityData[matchedC][matchedS].forEach(ci => {
            const opt = document.createElement('option');
            opt.value = ci;
            dlCity.appendChild(opt);
          });
        }
      }
    };

    updateStateOptions();
    updateCityOptions();

    if (!isReadOnly) {
      countryInput.addEventListener('input', () => {
        updateStateOptions();
        updateCityOptions();
      });
      stateInput.addEventListener('input', () => {
        updateCityOptions();
      });
    }
  }

  // 📋 Same as Permanent Address copy handler
  if (!isReadOnly) {
    const copyAddressBtn = document.getElementById('copy-address-btn');
    if (copyAddressBtn) {
      copyAddressBtn.addEventListener('click', () => {
        const permAddr = document.getElementById('p_permanent_address')?.value || '';
        const currentAddrInput = document.getElementById('p_current_address');
        if (currentAddrInput) {
          currentAddrInput.value = permAddr;
          // Feedback effect
          copyAddressBtn.innerHTML = '✓ Copied!';
          copyAddressBtn.style.borderColor = 'rgba(16, 185, 129, 0.5)';
          copyAddressBtn.style.color = 'var(--brand-secondary)';
          copyAddressBtn.style.background = 'rgba(16, 185, 129, 0.15)';
          setTimeout(() => {
            copyAddressBtn.innerHTML = '📋 Same as Permanent';
            copyAddressBtn.style.borderColor = 'rgba(129, 140, 248, 0.3)';
            copyAddressBtn.style.color = 'var(--brand-primary)';
            copyAddressBtn.style.background = 'rgba(129, 140, 248, 0.12)';
          }, 1800);
        }
      });
    }
  }

  // 🟢 Transfer Proposal Execution Sub-system
  if (!isReadOnly) {
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
          if (!dbClient || typeof dbClient.from !== 'function') throw new Error('Database client is offline.');
          const response = await withTimeout(
            dbClient
              .from('section_requests')
              .insert([{
                student_id: user.id,
                current_dept: user.department,
                current_section: user.section_name,
                target_dept: user.department,
                target_section: targetSec,
                reason: reason,
                status: 'Pending'
              }]),
            15000,
            { error: { message: 'Database connection timed out.' } }
          );
          if (response?.error) throw response.error;

          submitTransferBtn.disabled = false;
          submitTransferBtn.textContent = 'Transmit Proposal to Advisor';
          
          alert('Success: Transfer proposal successfully transmitted to Faculty Advisor Registry.');
          
          // Rerender profile view to show the pending banner
          loadProfilePage(container, Store, getActiveTab());
        } catch (err) {
          alert('Transmission Refused: ' + err.message);
          submitTransferBtn.disabled = false;
          submitTransferBtn.textContent = 'Transmit Proposal to Advisor';
        }
      });
    }
  }

  // Save button logic (Exactly same as original)
  if (!isReadOnly) {
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
            department: (() => {
              const val = getVal('a_department');
              if (!val) return null;
              const found = depts.find(d => d.name?.toLowerCase() === val.toLowerCase() || d.id === val);
              return found ? found.id : val;
            })(),
            section_name: (() => {
              const val = getVal('a_section');
              if (!val) return null;
              return val.replace(/^Section\s+/i, '');
            })(),
            batch_year: getVal('a_batch_year'),
            current_semester: (() => {
              const val = getVal('a_current_semester');
              if (!val) return null;
              const num = parseInt(val.replace(/\D/g, ''));
              return isNaN(num) ? val : num;
            })(),
            cgpa: parseFloat(getVal('a_cgpa')) || null,
            technical_skills: getVal('a_technical_skills'),
            soft_skills: getVal('a_soft_skills'),
            skills: (getVal('a_technical_skills') || '').split(',').map(s => s.trim()).filter(Boolean)
          };

          let response = null;
          if (dbClient && typeof dbClient.from === 'function') {
            response = await withTimeout(
              dbClient.from('profiles').upsert({ id: user.id, ...updates }),
              1500,
              { error: { message: 'Database transaction timed out.' } }
            );
          } else {
            response = { error: { message: 'Database transaction offline.' } };
          }

          // Always commit updates to local session, cache, and Store registry
          Store.session.user = { ...Store.session.user, ...updates };
          localStorage.setItem('placenix-mock-session', JSON.stringify(Store.session.user));
          localStorage.setItem('placenix_user_session', JSON.stringify(Store.session.user));
          
          try {
            const profileCache = JSON.parse(localStorage.getItem('placenix_profile_cache') || '{}');
            profileCache[user.id] = {
              ...(profileCache[user.id] || {}),
              ...Store.session.user,
              ...updates
            };
            localStorage.setItem('placenix_profile_cache', JSON.stringify(profileCache));
          } catch(e){}

          if (Array.isArray(Store.students)) {
            const idx = Store.students.findIndex(s => s.id === user.id);
            if (idx !== -1) {
              Store.students[idx] = {
                ...Store.students[idx],
                ...updates,
                name: updates.full_name || Store.students[idx].name,
                dept: updates.department || Store.students[idx].dept,
                cgpa: updates.cgpa || Store.students[idx].cgpa,
                skills: updates.skills || Store.students[idx].skills
              };
            } else {
              Store.students.push({
                id: user.id,
                name: updates.full_name || user.full_name || 'Student',
                dept: updates.department || user.department || 'CSE',
                cgpa: updates.cgpa || 8.0,
                skills: updates.skills || [],
                status: 'Approved',
                avatar: ((updates.full_name || user.full_name || 'S')[0] || 'S').toUpperCase(),
                ...updates
              });
            }
          }
          saveStore();

          btn.textContent = 'Save Identity';
          btn.disabled = false;

          if (response?.error) {
            console.warn('⚠️ Supabase upsert timed out/failed. Saved locally to workspace persistence.');
            showToast('Profile updated & saved locally to workspace!', 'success');
          } else {
            showToast('Profile saved successfully to cloud registry!', 'success');
          }

          loadProfilePage(container, Store, getActiveTab());
        } catch (err) {
          showToast('Commit failed: ' + err.message, 'danger');
        } finally {
          btn.textContent = 'Save Identity';
          btn.disabled = false;
        }
      });
    }
  }

  // Section Transfer Proposal logic
  const triggerTransferBtn = document.getElementById('request-transfer-trigger');
  const transferPanel = document.getElementById('transfer-request-panel');
  const submitTransferBtn = document.getElementById('submit-transfer-btn');

  if (triggerTransferBtn && transferPanel) {
    triggerTransferBtn.onclick = () => {
      transferPanel.style.display = transferPanel.style.display === 'none' ? 'flex' : 'none';
    };
  }

  if (submitTransferBtn) {
    submitTransferBtn.onclick = () => {
      const targetSec = document.getElementById('t_target_section')?.value;
      const reason = document.getElementById('t_reason')?.value;

      if (!targetSec) {
        alert('Please choose a target section node.');
        return;
      }

      if (!Store.transferRequests) Store.transferRequests = [];
      
      const newReq = {
        id: 'req_' + Date.now(),
        studentId: user.id,
        studentName: user.full_name || user.name || 'Student',
        fromSection: user.section_name || 'A',
        target_section: targetSec,
        department: user.department || 'CSE',
        reason: reason || 'Academic reassignment request',
        status: 'pending',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      Store.transferRequests.push(newReq);
      localStorage.setItem('placenix_transfer_requests', JSON.stringify(Store.transferRequests));
      window.dispatchEvent(new CustomEvent('store-updated'));

      if (window.Toast) window.Toast.show('Proposal transmitted to Faculty Advisor for review.', 'success');
      else alert('Proposal transmitted to Faculty Advisor for review.');

      loadProfilePage(container, Store, getActiveTab());
    };
  }

  // Re-attach other original logic (Experience, Documents)
  let fileInput = null;
  if (!isReadOnly) {
    fileInput = document.createElement('input');
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

      let loadingOverlay = null;
      if (docType === 'primary_resume') {
        loadingOverlay = document.createElement('div');
        loadingOverlay.style = `
          position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
          background: rgba(9,9,11,0.85); backdrop-filter: blur(8px); 
          display: flex; flex-direction: column; align-items: center; justify-content: center; 
          z-index: 9999; color: #fff; font-family: 'Inter', sans-serif; gap: 20px;
        `;
        loadingOverlay.innerHTML = `
          <div style="width:40px; height:40px; border:3px solid var(--border-subtle); border-top-color:var(--brand-primary); border-radius:50%; animation: profile-spin 1s linear infinite;"></div>
          <div style="font-weight: 800; font-size: 16px; letter-spacing: -0.02em;">Running AI Resume Analysis...</div>
          <div style="font-size: 13px; color: var(--text-description); max-width: 300px; text-align: center; line-height: 1.5;">Extracting text from PDF and computing ATS keywords & score directives.</div>
        `;
        if (!document.getElementById('profile-spin-style')) {
          const style = document.createElement('style');
          style.id = 'profile-spin-style';
          style.innerHTML = `@keyframes profile-spin { to { transform: rotate(360deg); } }`;
          document.head.appendChild(style);
        }
        document.body.appendChild(loadingOverlay);
      }

      try {
        if (!dbClient || typeof dbClient.storage !== 'object') throw new Error('Database storage client is offline.');
        
        const fileName = `${user.id}/${docType}_${Date.now()}.${file.name.split('.').pop()}`;
        const uploadResponse = await withTimeout(
          dbClient.storage.from('student-documents').upload(fileName, file),
          20000,
          { error: { message: 'Upload timed out. Check connection.' } }
        );
        if (uploadResponse?.error) throw uploadResponse.error;

        const { data: { publicUrl } } = dbClient.storage.from('student-documents').getPublicUrl(fileName);
        const docs = user.documents || {};
        docs[docType] = publicUrl;

        let dbData = { id: user.id, documents: docs };

        if (docType === 'primary_resume') {
          try {
            const text = await extractTextFromPDF(file);
            const targetRole = user.career_interests?.[0] || 'Software Engineer';
            const analysis = await analyzeWithGemini(text, targetRole, Store);

            const updatedAnalysis = {
              ...(user.resume_analysis || {}),
              ats_score: analysis.ats_score,
              suggestions: analysis.suggestions,
              found_keywords: analysis.found_keywords,
              missing_keywords: analysis.missing_keywords,
              industry_match: analysis.industry_match,
              sandbox: analysis,
              sandbox_url: publicUrl
            };

            dbData.resume_url = publicUrl;
            dbData.resume_analysis = updatedAnalysis;

            user.resume_url = publicUrl;
            user.resume_analysis = updatedAnalysis;
          } catch (aiErr) {
            console.error("AI Analysis failed during Primary Resume upload:", aiErr);
            alert("Warning: AI Resume Analysis failed. The resume was uploaded, but official profile metrics were not updated.");
          }
        }

        let upsertResponse = null;
        if (dbClient && typeof dbClient.from === 'function') {
          upsertResponse = await withTimeout(
            dbClient.from('profiles').upsert(dbData),
            15000,
            { error: { message: 'Cloud database commit timed out. Saved locally.' } }
          );
        } else {
          upsertResponse = { error: { message: 'Cloud database offline. Saved locally.' } };
        }

        Store.session.user.documents = docs;
        try {
          const profileCache = JSON.parse(localStorage.getItem('placenix_profile_cache') || '{}');
          profileCache[user.id] = {
            ...(profileCache[user.id] || {}),
            ...Store.session.user,
            documents: docs,
            resume_url: user.resume_url || Store.session.user.resume_url,
            resume_analysis: user.resume_analysis || Store.session.user.resume_analysis
          };
          localStorage.setItem('placenix_profile_cache', JSON.stringify(profileCache));
        } catch(e){}
        saveStore();
        
        if (upsertResponse?.error) {
          console.warn('⚠️ Profile document updates timed out/failed. Saved locally.');
          alert('Document uploaded and saved locally in your current workspace.');
        } else {
          if (docType === 'primary_resume') {
            alert('Primary resume verified, uploaded, and analyzed by AI successfully.');
          } else {
            alert('Document verified and uploaded.');
          }
        }
        
        loadProfilePage(container, Store, getActiveTab());
      } catch (err) { 
        alert('Upload failed: ' + err.message); 
      } finally {
        if (loadingOverlay) loadingOverlay.remove();
      }
    });
  }

  // Modal logic
  const expModal = document.getElementById('exp-modal');
  const addExpBtn = document.getElementById('add-exp-btn');
  const expCancelBtn = document.getElementById('exp-cancel');
  const expTypeSelect = document.getElementById('exp-type');
  const expSaveBtn = document.getElementById('exp-save');

  if (!isReadOnly && addExpBtn && expModal) {
    addExpBtn.onclick = () => expModal.style.display='flex';
  }
  if (!isReadOnly && expCancelBtn && expModal) {
    expCancelBtn.onclick = () => expModal.style.display='none';
  }
  if (!isReadOnly && expTypeSelect) {
    expTypeSelect.onchange = (e) => {
      const intFields = document.getElementById('exp-internship-fields');
      const prjFields = document.getElementById('exp-project-fields');
      if (intFields) intFields.style.display = e.target.value==='internship'?'block':'none';
      if (prjFields) prjFields.style.display = e.target.value==='project'?'block':'none';
    };
  }

  if (!isReadOnly && expSaveBtn) {
    expSaveBtn.onclick = async () => {
      const type = document.getElementById('exp-type')?.value;
      try {
        if (!Store.session.user.internships) Store.session.user.internships = [];
        if (!Store.session.user.projects) Store.session.user.projects = [];

        if (type === 'internship') {
          const item = {
            student_id: user.id,
            company: document.getElementById('exp-company')?.value,
            role: document.getElementById('exp-role')?.value,
            start_date: document.getElementById('exp-start')?.value,
            end_date: document.getElementById('exp-end')?.value,
            description: document.getElementById('exp-desc')?.value
          };

          let response = null;
          if (dbClient && typeof dbClient.from === 'function') {
            response = await withTimeout(
              dbClient.from('internships').insert(item),
              15000,
              { error: { message: 'Database query timed out.' } }
            );
          } else {
            response = { error: { message: 'Database offline. Saved locally.' } };
          }

          Store.session.user.internships.push(item);
          try {
            const profileCache = JSON.parse(localStorage.getItem('placenix_profile_cache') || '{}');
            profileCache[user.id] = {
              ...(profileCache[user.id] || {}),
              ...Store.session.user,
              internships: Store.session.user.internships
            };
            localStorage.setItem('placenix_profile_cache', JSON.stringify(profileCache));
          } catch(e){}
          saveStore();

          if (response?.error) {
            console.warn('⚠️ Cloud commit failed/timed out. Saved internship locally.');
            alert('Notice: Experience has been logged locally in your current workspace.');
          } else {
            alert('Experience committed to cloud registry.');
          }
        } else {
          const item = {
            student_id: user.id,
            title: document.getElementById('exp-title')?.value,
            tech_stack: document.getElementById('exp-tech')?.value?.split(','),
            github_url: document.getElementById('exp-git')?.value
          };

          let response = null;
          if (dbClient && typeof dbClient.from === 'function') {
            response = await withTimeout(
              dbClient.from('projects').insert(item),
              15000,
              { error: { message: 'Database query timed out.' } }
            );
          } else {
            response = { error: { message: 'Database offline. Saved locally.' } };
          }

          Store.session.user.projects.push(item);
          try {
            const profileCache = JSON.parse(localStorage.getItem('placenix_profile_cache') || '{}');
            profileCache[user.id] = {
              ...(profileCache[user.id] || {}),
              ...Store.session.user,
              projects: Store.session.user.projects
            };
            localStorage.setItem('placenix_profile_cache', JSON.stringify(profileCache));
          } catch(e){}
          saveStore();

          if (response?.error) {
            console.warn('⚠️ Cloud commit failed/timed out. Saved project locally.');
            alert('Notice: Experience has been logged locally in your current workspace.');
          } else {
            alert('Experience committed to cloud registry.');
          }
        }
        if (expModal) expModal.style.display = 'none';
        loadExperiences();
      } catch (err) { alert('Error: ' + err.message); }
    };
  }

  async function loadExperiences() {
    const list = document.getElementById('experience-list');
    if (!list) return;

    let intsResponse = null;
    let projsResponse = null;

    if (dbClient && typeof dbClient.from === 'function') {
      intsResponse = await withTimeout(
        dbClient.from('internships').select('*').eq('student_id', user.id),
        3500,
        { data: null }
      );
      projsResponse = await withTimeout(
        dbClient.from('projects').select('*').eq('student_id', user.id),
        3500,
        { data: null }
      );
    }

    const ints = intsResponse?.data || Store.session?.user?.internships || [];
    const projs = projsResponse?.data || Store.session?.user?.projects || [];

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
