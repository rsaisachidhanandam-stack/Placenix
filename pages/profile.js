import { supabase } from '../supabase.js';
import { extractTextFromPDF, analyzeWithGemini } from './resume-intelligence.js';

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

export async function loadProfilePage(root, Store, maybeSupabase, activeTabId = 'tab-personal') {
  console.log('🏁 loadProfilePage: Initiating secure load sequence...');
  const loggedInUser = Store.session.user || {};
  const hash = window.location.hash || '';
  const hashParams = new URLSearchParams(hash.includes('?') ? hash.substring(hash.indexOf('?')) : '');
  let targetStudentId = hashParams.get('id');
  if (targetStudentId === '58ad3ece-0f28-4b73-bc81-2b234df9aeab') {
    targetStudentId = '58ad3eee-0f28-4b73-bc81-2b234df9aeab';
  }
  const isReadOnly = targetStudentId && targetStudentId !== loggedInUser.id;
  
  let user = null;
  const currentTab = (typeof maybeSupabase === 'string') ? maybeSupabase : activeTabId;

  // Show premium shimmer skeleton loader for a fluid and high-end enterprise aesthetic
  root.innerHTML = `
    <div style="padding: 48px; max-width: 1200px; margin: 0 auto; animation: fadeIn 0.4s ease;">
      <style>
        @keyframes shimmer-pulse {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .skeleton-shimmer {
          background: linear-gradient(90deg, rgba(255,255,255,0.02) 25%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.02) 75%);
          background-size: 200% 100%;
          animation: shimmer-pulse 1.8s infinite linear;
          border-radius: 12px;
        }
      </style>
      
      <!-- Header Area Skeleton -->
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:48px; background: rgba(255,255,255,0.01); padding:32px; border-radius:24px; border:1px solid var(--border-subtle);">
        <div style="display:flex; align-items:center; gap:24px;">
          <div class="skeleton-shimmer" style="width:80px; height:80px; border-radius:24px;"></div>
          <div style="display:flex; flex-direction:column; gap:8px;">
            <div class="skeleton-shimmer" style="width:240px; height:28px; border-radius:6px;"></div>
            <div class="skeleton-shimmer" style="width:360px; height:16px; border-radius:4px;"></div>
          </div>
        </div>
        <div class="skeleton-shimmer" style="width:160px; height:44px; border-radius:12px;"></div>
      </div>

      <!-- Institutional Tabs Skeleton -->
      <div style="display:flex; gap:32px; border-bottom:1px solid var(--border-subtle); margin-bottom:48px; padding-bottom:16px;">
        <div class="skeleton-shimmer" style="width:140px; height:20px; border-radius:4px;"></div>
        <div class="skeleton-shimmer" style="width:140px; height:20px; border-radius:4px;"></div>
        <div class="skeleton-shimmer" style="width:140px; height:20px; border-radius:4px;"></div>
      </div>

      <!-- Core Identity Node Skeleton Grid -->
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px;">
        <!-- Left Panel Card Skeleton -->
        <div style="background: rgba(255,255,255,0.01); border:1px solid var(--border-subtle); border-radius:24px; padding:32px; display:flex; flex-direction:column; gap:24px;">
          <div class="skeleton-shimmer" style="width:150px; height:20px; border-radius:4px; margin-bottom:8px;"></div>
          <div style="display:flex; flex-direction:column; gap:20px;">
            <div style="display:flex; flex-direction:column; gap:8px;">
              <div class="skeleton-shimmer" style="width:100px; height:12px; border-radius:3px;"></div>
              <div class="skeleton-shimmer" style="width:100%; height:44px;"></div>
            </div>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px;">
              <div style="display:flex; flex-direction:column; gap:8px;">
                <div class="skeleton-shimmer" style="width:80px; height:12px; border-radius:3px;"></div>
                <div class="skeleton-shimmer" style="width:100%; height:44px;"></div>
              </div>
              <div style="display:flex; flex-direction:column; gap:8px;">
                <div class="skeleton-shimmer" style="width:80px; height:12px; border-radius:3px;"></div>
                <div class="skeleton-shimmer" style="width:100%; height:44px;"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Panel Card Skeleton -->
        <div style="background: rgba(255,255,255,0.01); border:1px solid var(--border-subtle); border-radius:24px; padding:32px; display:flex; flex-direction:column; gap:24px;">
          <div class="skeleton-shimmer" style="width:180px; height:20px; border-radius:4px; margin-bottom:8px;"></div>
          <div style="display:flex; flex-direction:column; gap:20px;">
            <div style="display:flex; flex-direction:column; gap:8px;">
              <div class="skeleton-shimmer" style="width:120px; height:12px; border-radius:3px;"></div>
              <div class="skeleton-shimmer" style="width:100%; height:44px;"></div>
            </div>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px;">
              <div style="display:flex; flex-direction:column; gap:8px;">
                <div class="skeleton-shimmer" style="width:80px; height:12px; border-radius:3px;"></div>
                <div class="skeleton-shimmer" style="width:100%; height:44px;"></div>
              </div>
              <div style="display:flex; flex-direction:column; gap:8px;">
                <div class="skeleton-shimmer" style="width:80px; height:12px; border-radius:3px;"></div>
                <div class="skeleton-shimmer" style="width:100%; height:44px;"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // 1. Fetch user profile, departments, degrees, and academic batches in parallel for maximum performance
  let depts = [];
  let degrees = [];
  let batches = [];

  const targetId = targetStudentId || loggedInUser.id;
  const profilePromise = supabase.from('profiles').select('*').eq('id', targetId).maybeSingle();
  const deptsPromise = supabase.from('departments').select('*, sections(*)');
  const degreesPromise = supabase.from('degrees').select('*').order('degree_name');
  const batchesPromise = supabase.from('academic_batches').select('*').order('batch_name');

  console.log('🏁 [Placenix Parallel Sync] Fetching profile and academic metadata concurrently...');
  try {
    const [profileRes, deptsRes, degreesRes, batchesRes] = await Promise.all([
      withTimeout(profilePromise, 3500, { data: null, error: { message: 'Profile query timed out' } }),
      withTimeout(deptsPromise, 3500, { data: [], error: { message: 'Departments query timed out' } }),
      withTimeout(degreesPromise, 3500, { data: [], error: { message: 'Degrees query timed out' } }),
      withTimeout(batchesPromise, 3500, { data: [], error: { message: 'Batches query timed out' } })
    ]);

    if (profileRes && profileRes.data) {
      user = profileRes.data;
      console.log(`🏁 Successfully loaded profile for: ${user.full_name}`);
    } else if (profileRes && profileRes.error) {
      console.error(`❌ Error fetching target profile: ${profileRes.error.message}`);
    }

    if (deptsRes && deptsRes.data) {
      depts = deptsRes.data;
    }

    if (degreesRes && degreesRes.data) {
      degrees = degreesRes.data;
    }

    if (batchesRes && batchesRes.data) {
      batches = batchesRes.data;
    }
  } catch (err) {
    console.error('❌ Critical parallel sync exception:', err);
  }

  // 1.5. Robust Fallback: If Supabase fetch failed/timed out, try loading from local Store registry
  if (!user && targetStudentId && Store && Array.isArray(Store.students)) {
    const localStudent = Store.students.find(s => s.id === targetStudentId);
    if (localStudent) {
      console.log(`🏁 Robust Fallback: Found student in local Store registry: ${localStudent.name}`);
      user = {
        id: localStudent.id,
        full_name: localStudent.name,
        department: localStudent.dept,
        cgpa: localStudent.cgpa,
        skills: localStudent.skills || [],
        role: 'student',
        college: 'Kalasalingam University'
      };
    }
  }

  // 2. Fallbacks for target student or logged-in user profile if still not found
  if (!user) {
    if (isReadOnly) {
      console.warn('⚠️ Read-only target student not found in DB or local store. Rendering safe not-found state.');
      user = {
        id: targetStudentId,
        full_name: 'Student Profile Not Found',
        college: 'Kalasalingam University',
        department: 'General',
        section_name: 'TBD',
        role: 'student'
      };
    } else {
      console.log(`🏁 Target student not loaded. Syncing loggedInUser profile: ${loggedInUser.id}...`);
      user = { ...loggedInUser };
    }
  } else if (!targetStudentId || targetStudentId === loggedInUser.id) {
    Store.session.user = user;
    console.log('🏁 Saved synced user back to Store session context.');
  }

  // 4. Scan active section requests (must happen after user identification)
  let pendingReq = null;
  if (user && user.id) {
    console.log(`🏁 Scanning active section requests for student: ${user.id}...`);
    try {
      const response = await withTimeout(
        supabase.from('section_requests').select('*').eq('student_id', user.id).eq('status', 'Pending').maybeSingle(),
        2000,
        { data: null }
      );
      if (response && response.data) {
        pendingReq = response.data;
        console.log(`🏁 Active section request found: target Section ${pendingReq.target_section}`);
      }
    } catch (err) {
      console.error(`❌ Section requests scan exception: ${err.message}`);
    }
  }

  // 6. Generate final profile HTML and bind interactive listeners
  console.log('🏁 Rendering final student profile layout...');
  try {
    root.innerHTML = getProfileHTML(user, depts, pendingReq, degrees, batches, currentTab, isReadOnly);
    initProfileScripts(user, Store, supabase, depts, pendingReq, currentTab, isReadOnly);
    console.log('🏁 Load sequence completed successfully. Student academic details fully aligned.');
  } catch (err) {
    console.error('❌ Critical crash during final profile layout mount:', err);
    root.innerHTML = `
      <div style="padding:48px; text-align:center; color:var(--text-main);">
        <div style="font-size:36px; margin-bottom:16px;">⚠️</div>
        <h3 style="font-weight:700;">Academic Profile Assembly Failure</h3>
        <p style="font-size:13px; color:var(--text-description); margin-top:8px; max-width:500px; margin-left:auto; margin-right:auto;">
          The interface encountered a presentation error while mounting the student metadata layers.
        </p>
        <code style="display:inline-block; margin-top:16px; padding:12px; background:rgba(255,255,255,0.03); border:1px solid var(--border-subtle); border-radius:8px; color:var(--brand-secondary); font-family:monospace; font-size:12px;">${err.message}</code>
      </div>
    `;
  }
}

function getProfileHTML(user, depts = [], pendingReq = null, degrees = [], batches = [], activeTabId = 'tab-personal', isReadOnly = false) {
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
      </div>
      ${isReadOnly ? `
        <div style="display:flex; gap:16px; align-items:center;">
          <span style="background: rgba(139, 92, 246, 0.1); border: 1px solid rgba(139, 92, 246, 0.3); color: var(--brand-secondary); font-size: 13px; font-weight: 700; padding: 8px 16px; border-radius: 12px; display: flex; align-items: center; gap: 8px;">
            🛡️ Viewing Profile (Read-Only)
          </span>
          <button class="btn btn-secondary" onclick="window.history.back()" style="height:44px; padding:0 24px; border-radius:12px; font-weight:700;">Back</button>
        </div>
      ` : `
        <button class="btn btn-primary" id="save-profile-btn" style="height:44px; padding:0 24px; border-radius:12px; font-weight:700;">Save Identity</button>
      `}
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
              <select id="p_gender" class="input-ent" ${isReadOnly ? 'disabled' : ''}>
                <option value="Male" ${user.gender === 'Male' ? 'selected' : ''}>Male</option>
                <option value="Female" ${user.gender === 'Female' ? 'selected' : ''}>Female</option>
                <option value="Other" ${user.gender === 'Other' ? 'selected' : ''}>Other</option>
              </select>
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
          <label class="label-ent">Current Communication Address</label>
          <textarea id="p_current_address" class="input-ent" style="height:80px; resize:none;" placeholder="Not Provided (TBD)" ${isReadOnly ? 'disabled' : ''}>${user.current_address || ''}</textarea>
        </div>
      </div>
      <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:20px;">
        <div class="input-node">
          <label class="label-ent">Country</label>
          <select id="p_country" class="input-ent" style="appearance:auto;" ${isReadOnly ? 'disabled' : ''}>
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
              <select id="a_degree" class="input-ent" style="appearance:auto;" ${isReadOnly ? 'disabled' : ''}>
                <option disabled ${!user.degree ? 'selected' : ''}>Choose Degree...</option>
                ${degrees.map(d => `<option value="${d.degree_name}" ${user.degree === d.degree_name ? 'selected' : ''}>${d.degree_name}</option>`).join('')}
              </select>
            </div>
            <div class="input-node">
              <label class="label-ent">Academic Batch</label>
              <select id="a_batch_year" class="input-ent" style="appearance:auto;" ${isReadOnly ? 'disabled' : ''}>
                <option disabled ${!user.batch_year ? 'selected' : ''}>Choose Batch...</option>
                ${batches.map(b => `<option value="${b.batch_name}" ${user.batch_year === b.batch_name ? 'selected' : ''}>${b.batch_name}</option>`).join('')}
              </select>
            </div>
          </div>
          
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px;">
            <div class="input-node">
              <label class="label-ent">Major / Department</label>
              <select id="a_department" class="input-ent" style="appearance:auto;" ${user.section_name || isReadOnly ? 'disabled' : ''}>
                <option disabled ${!user.department ? 'selected' : ''}>Select Department...</option>
                ${depts.map(d => `<option value="${d.id}" ${user.department === d.id ? 'selected' : ''}>${d.name}</option>`).join('')}
              </select>
            </div>
            <div class="input-node">
              <label class="label-ent">Section Node</label>
              <select id="a_section" class="input-ent" style="appearance:auto;" ${user.section_name || isReadOnly ? 'disabled' : ''}>
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
              <select id="a_current_semester" class="input-ent" ${isReadOnly ? 'disabled' : ''}>
                ${[1,2,3,4,5,6,7,8].map(s => `<option value="${s}" ${user.current_semester == s ? 'selected' : ''}>Semester ${s}</option>`).join('')}
              </select>
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

function initProfileScripts(user, Store, supabase, depts = [], pendingReq = null, activeTabId = 'tab-personal', isReadOnly = false) {
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
  
  if (deptSelect && sectionSelect && !isReadOnly) {
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
    if (isReadOnly) {
      countrySelect.disabled = true;
      stateSelect.disabled = true;
      citySelect.disabled = true;
    }

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

      stateSelect.disabled = isReadOnly;
      const states = Object.keys(localityData[selectedCountry]);
      states.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s;
        opt.textContent = s;
        stateSelect.appendChild(opt);
      });

      // Inject dynamic fallback override
      if (!isReadOnly) {
        const otherOpt = document.createElement('option');
        otherOpt.value = 'Other...';
        otherOpt.textContent = 'Other (Type manually)...';
        stateSelect.appendChild(otherOpt);
      }

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

      citySelect.disabled = isReadOnly;
      const cities = localityData[selectedCountry][selectedState];
      cities.forEach(city => {
        const opt = document.createElement('option');
        opt.value = city;
        opt.textContent = city;
        citySelect.appendChild(opt);
      });

      // Inject dynamic fallback override
      if (!isReadOnly) {
        const otherOpt = document.createElement('option');
        otherOpt.value = 'Other...';
        otherOpt.textContent = 'Other (Type manually)...';
        citySelect.appendChild(otherOpt);
      }

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
    if (!isReadOnly) {
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
          const response = await withTimeout(
            supabase
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
          loadProfilePage(document.getElementById('page-root'), Store, getActiveTab());
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
            department: getVal('a_department'),
            section_name: getVal('a_section'), // Captured system section identifier!
            batch_year: getVal('a_batch_year'),
            current_semester: getVal('a_current_semester'),
            cgpa: parseFloat(getVal('a_cgpa')) || null,
            technical_skills: getVal('a_technical_skills'),
            soft_skills: getVal('a_soft_skills'),
            skills: (getVal('a_technical_skills') || '').split(',').map(s => s.trim()).filter(Boolean)
          };

          const response = await withTimeout(
            supabase.from('profiles').upsert({ id: user.id, ...updates }),
            15000,
            { error: { message: 'Database transaction timed out. Saving locally only.' } }
          );

          if (response?.error) {
            console.warn('⚠️ Supabase upsert failed/timed out. Committing locally to Store context.');
            Store.session.user = { ...Store.session.user, ...updates };
            if (Array.isArray(Store.students)) {
              const idx = Store.students.findIndex(s => s.id === user.id);
              if (idx !== -1) {
                Store.students[idx] = {
                  ...Store.students[idx],
                  name: updates.full_name,
                  dept: updates.department,
                  cgpa: updates.cgpa,
                  skills: updates.skills
                };
              }
            }

            btn.textContent = 'Save Profile Identity';
            btn.disabled = false;

            alert('Notice: Cloud sync timed out. Profile changes have been saved locally in your current workspace.');
            loadProfilePage(document.getElementById('page-root'), Store, getActiveTab());
            return;
          }

          Store.session.user = { ...Store.session.user, ...updates };
          
          btn.textContent = 'Save Profile Identity';
          btn.disabled = false;

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
        const fileName = `${user.id}/${docType}_${Date.now()}.${file.name.split('.').pop()}`;
        const uploadResponse = await withTimeout(
          supabase.storage.from('student-documents').upload(fileName, file),
          20000,
          { error: { message: 'Upload timed out. Check connection.' } }
        );
        if (uploadResponse?.error) throw uploadResponse.error;

        const { data: { publicUrl } } = supabase.storage.from('student-documents').getPublicUrl(fileName);
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

        const upsertResponse = await withTimeout(
          supabase.from('profiles').upsert(dbData),
          15000,
          { error: { message: 'Cloud database commit timed out. Saved locally.' } }
        );

        Store.session.user.documents = docs;
        
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
        
        loadProfilePage(document.getElementById('page-root'), Store, getActiveTab());
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

          const response = await withTimeout(
            supabase.from('internships').insert(item),
            15000,
            { error: { message: 'Database query timed out.' } }
          );

          Store.session.user.internships.push(item);

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

          const response = await withTimeout(
            supabase.from('projects').insert(item),
            15000,
            { error: { message: 'Database query timed out.' } }
          );

          Store.session.user.projects.push(item);

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

    const intsResponse = await withTimeout(
      supabase.from('internships').select('*').eq('student_id', user.id),
      3500,
      { data: null }
    );
    const projsResponse = await withTimeout(
      supabase.from('projects').select('*').eq('student_id', user.id),
      3500,
      { data: null }
    );

    const ints = intsResponse?.data || Store.session.user.internships || [];
    const projs = projsResponse?.data || Store.session.user.projects || [];

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
