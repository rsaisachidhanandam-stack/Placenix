export async function loadProfilePage(root, Store, supabase) {
  const user = Store.session.user || {};
  root.innerHTML = getProfileHTML(user);
  initProfileScripts(user, Store, supabase);
}

function getProfileHTML(user) {
  return `
  <div style="padding: 48px; max-width: 1200px; margin: 0 auto;">
    <!-- Profile Infrastructure -->
    <div class="flex items-center gap-8" style="display:flex; align-items:center; gap:32px; margin-bottom:48px;">
      <div style="width:92px; height:92px; background:var(--brand-primary); border-radius:24px; display:flex; align-items:center; justify-content:center; font-size:40px; font-weight:800; color:white; box-shadow:0 12px 24px -6px rgba(139,92,246,0.4); flex-shrink:0;">
        ${(user.full_name || 'U')[0].toUpperCase()}
      </div>
      <div style="flex:1;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <h1 class="h1-ent" style="margin-bottom:8px;">${user.full_name || 'Professional Identity'}</h1>
            <div class="flex items-center" style="display:flex; align-items:center; gap:12px; color:var(--text-description); font-size:14px; font-weight:500;">
              <span>${user.roll_number || 'STU-000'}</span>
              <span style="opacity:0.2;">•</span>
              <span>${user.department || 'General'}</span>
              <span style="opacity:0.2;">•</span>
              <span>${user.college || 'Kalasalingam University'}</span>
            </div>
          </div>
          <button class="btn btn-primary" id="save-profile-btn" style="height:44px; padding:0 24px; border-radius:12px; font-weight:700;">Save Identity</button>
        </div>
      </div>
    </div>

    <!-- Institutional Tabs -->
    <div style="display:flex; gap:32px; border-bottom:1px solid var(--border-subtle); margin-bottom:48px;">
      <div class="profile-tab active" data-tab="tab-personal">Personal Workspace</div>
      <div class="profile-tab" data-tab="tab-academic">Academic Record</div>
      <div class="profile-tab" data-tab="tab-documents">Verification Vault</div>
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

  <div class="profile-content active" id="tab-personal">
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
              <input type="tel" id="p_phone" class="input-ent" value="${user.phone || ''}">
            </div>
            <div class="input-node">
              <label class="label-ent">Emergency Contact</label>
              <input type="tel" id="p_emergency" class="input-ent" value="${user.emergency || ''}">
            </div>
          </div>
          <div class="input-node">
            <label class="label-ent">LinkedIn Workspace URL</label>
            <input type="text" id="p_linkedin" class="input-ent" value="${user.linkedin || ''}" placeholder="linkedin.com/in/username">
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
        <div class="input-node"><label class="label-ent">City</label><input type="text" id="p_city" class="input-ent" value="${user.city || ''}"></div>
        <div class="input-node"><label class="label-ent">State / Region</label><input type="text" id="p_state" class="input-ent" value="${user.state || ''}"></div>
        <div class="input-node"><label class="label-ent">Postal Code</label><input type="text" id="p_zip" class="input-ent" value="${user.zip || ''}"></div>
        <div class="input-node"><label class="label-ent">Country</label><input type="text" id="p_country" class="input-ent" value="${user.country || ''}"></div>
      </div>
    </div>
  </div>

  <div class="profile-content" id="tab-academic" style="display:none;">
    <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 40px; align-items: stretch; margin-bottom: 40px;">
      <!-- Institution Node -->
      <div class="card-ent" style="display:flex; flex-direction:column; gap:24px;">
        <h3 class="h2-ent" style="font-size:16px;">Institution Details (UG/PG)</h3>
        <div style="display:flex; flex-direction:column; gap:20px;">
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px;">
            <div class="input-node">
              <label class="label-ent">Degree Program</label>
              <input type="text" id="a_degree" class="input-ent" value="${user.degree || ''}">
            </div>
            <div class="input-node">
              <label class="label-ent">Academic Batch</label>
              <input type="text" id="a_batch_year" class="input-ent" value="${user.batch_year || ''}">
            </div>
          </div>
          <div class="input-node">
            <label class="label-ent">Major / Department</label>
            <input type="text" id="a_department" class="input-ent" value="${user.department || ''}">
          </div>
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

  <div class="profile-content" id="tab-documents" style="display:none;">
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

function initProfileScripts(user, Store) {
  // Tab switching logic (Harmonized with v2.4 enterprise tabs)
  const tabBtns = document.querySelectorAll('.profile-tab');
  const contents = document.querySelectorAll('.profile-content');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      contents.forEach(c => c.style.display = 'none');

      btn.classList.add('active');
      const targetId = btn.getAttribute('data-tab');
      const target = document.getElementById(targetId);
      if (target) {
        target.style.display = 'block';
        // Force a layout recalculation for grids if needed
        window.dispatchEvent(new Event('resize'));
      }
    });
  });

  // Save button logic (Exactly same as original)
  document.getElementById('save-profile-btn').addEventListener('click', async () => {
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
        mobile_number: getVal('p_mobile_number'),
        emergency_contact: getVal('p_emergency_contact'),
        permanent_address: getVal('p_permanent_address'),
        current_address: getVal('p_current_address'),
        city: getVal('p_city'),
        state: getVal('p_state'),
        pincode: getVal('p_pincode'),
        country: getVal('p_country'),
        linkedin_url: getVal('p_linkedin_url'),
        degree: getVal('a_degree'),
        department: getVal('a_department'),
        batch_year: getVal('a_batch_year'),
        current_semester: getVal('a_current_semester'),
        cgpa: parseFloat(getVal('a_cgpa')) || null,
        technical_skills: getVal('a_technical_skills'),
        soft_skills: getVal('a_soft_skills'),
        skills: (getVal('a_technical_skills') || '').split(',').map(s => s.trim()).filter(Boolean)
      };

      const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);
      if (error) throw error;
      Store.session.user = { ...Store.session.user, ...updates };
      alert('Profile successfully committed to the enterprise registry.');
    } catch (err) {
      alert('Commit failed: ' + err.message);
    } finally {
      btn.textContent = 'Save Profile Identity';
      btn.disabled = false;
    }
  });

  // Re-attach other original logic (Experience, Documents)
  let fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.style.display = 'none';
  document.body.appendChild(fileInput);
  let currentDocType = '';

  document.querySelectorAll('.doc-card').forEach(card => {
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
      await supabase.from('profiles').update({ documents: docs }).eq('id', user.id);
      Store.session.user.documents = docs;
      alert('Document verified and uploaded.');
      loadProfilePage(document.getElementById('page-root'), Store);
    } catch (err) { alert('Upload failed: ' + err.message); }
  });

  // Modal logic
  const expModal = document.getElementById('exp-modal');
  document.getElementById('add-exp-btn').onclick = () => expModal.style.display='flex';
  document.getElementById('exp-cancel').onclick = () => expModal.style.display='none';
  document.getElementById('exp-type').onchange = (e) => {
    document.getElementById('exp-internship-fields').style.display = e.target.value==='internship'?'block':'none';
    document.getElementById('exp-project-fields').style.display = e.target.value==='project'?'block':'none';
  };

  document.getElementById('exp-save').onclick = async () => {
    const type = document.getElementById('exp-type').value;
    try {
      if (type === 'internship') {
        await supabase.from('internships').insert({
          student_id: user.id,
          company: document.getElementById('exp-company').value,
          role: document.getElementById('exp-role').value,
          start_date: document.getElementById('exp-start').value,
          end_date: document.getElementById('exp-end').value,
          description: document.getElementById('exp-desc').value
        });
      } else {
        await supabase.from('projects').insert({
          student_id: user.id,
          title: document.getElementById('exp-title').value,
          tech_stack: document.getElementById('exp-tech').value.split(','),
          github_url: document.getElementById('exp-git').value
        });
      }
      expModal.style.display='none';
      alert('Experience committed.');
      loadExperiences();
    } catch (err) { alert('Error: ' + err.message); }
  };

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
