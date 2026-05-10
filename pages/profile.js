import { supabase } from '../supabase.js';

export async function loadProfilePage(root, Store) {
  const user = Store.session.user || {};
  root.innerHTML = getProfileHTML(user);
  initProfileScripts(user, Store);
}

function getProfileHTML(user) {
  return `
<style>
.profile-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 24px;
}
.profile-user-info {
  display: flex;
  align-items: center;
  gap: 24px;
}
.profile-avatar-large {
  width: 90px;
  height: 90px;
  background: var(--gradient-brand);
  border-radius: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.5rem;
  color: white;
  font-weight: bold;
  box-shadow: var(--shadow-glow-violet);
}
.profile-tabs {
  display: flex;
  gap: 8px;
  border-bottom: 1px solid var(--border-subtle);
  margin-bottom: 24px;
}
.profile-tab {
  padding: 12px 24px;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  border-bottom: 3px solid transparent;
  transition: all 0.2s;
}
.profile-tab:hover {
  color: var(--text-primary);
}
.profile-tab.active {
  color: var(--brand-electric-violet);
  border-bottom-color: var(--brand-electric-violet);
}
.profile-content {
  display: none;
  animation: fadeIn 0.4s ease;
}
.profile-content.active {
  display: block;
}
.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}
.form-section {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
}
.form-section-title {
  font-family: var(--font-display);
  font-size: 1.1rem;
  font-weight: 700;
  margin-bottom: 20px;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 8px;
}
.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.form-label {
  font-size: 0.8rem;
  color: var(--text-secondary);
  font-weight: 500;
}
.form-input {
  background: var(--bg-input);
  border: 1px solid var(--border-input);
  border-radius: 8px;
  padding: 10px 14px;
  color: var(--text-primary);
  font-size: 0.9rem;
  transition: border-color 0.2s;
}
.form-input:focus {
  border-color: var(--brand-electric-violet);
  outline: none;
}
.form-input[readonly] {
  opacity: 0.7;
  cursor: not-allowed;
}
.doc-upload-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}
.doc-card {
  background: rgba(255,255,255,0.02);
  border: 1px dashed var(--border-medium);
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
}
.doc-card:hover {
  background: rgba(124,58,237,0.05);
  border-color: var(--brand-electric-violet);
}
.doc-icon {
  font-size: 1.5rem;
  margin-bottom: 8px;
  color: var(--text-muted);
}
</style>

<div class="profile-header animate-fade-in-up">
  <div class="profile-user-info">
    <div class="profile-avatar-large">${(user.full_name || 'U')[0].toUpperCase()}</div>
    <div>
      <h1 class="page-title" style="margin-bottom: 4px;">${user.full_name || 'Student Name'}</h1>
      <p class="page-subtitle">${user.department || 'Department'} · ${user.roll_number || 'Roll No'} · ${user.college || 'College'}</p>
    </div>
  </div>
  <div>
    <button class="btn btn-primary" id="save-profile-btn">Save Changes</button>
  </div>
</div>

<div class="profile-tabs animate-fade-in-up delay-100">
  <button class="profile-tab active" data-tab="tab-personal">Personal Details</button>
  <button class="profile-tab" data-tab="tab-academic">Academic Details</button>
  <button class="profile-tab" data-tab="tab-documents">Documents</button>
</div>

<!-- TAB 1: PERSONAL DETAILS -->
<div class="profile-content active" id="tab-personal">
  <div class="form-section animate-fade-in-up delay-200">
    <h3 class="form-section-title">👤 Basic Information</h3>
    <div class="form-grid">
      <div class="form-group"><label class="form-label">Full Name</label><input type="text" id="p_full_name" class="form-input" value="${user.full_name || ''}"></div>
      <div class="form-group"><label class="form-label">Register Number</label><input type="text" id="p_register_number" class="form-input" value="${user.register_number || ''}"></div>
      <div class="form-group"><label class="form-label">Roll Number</label><input type="text" id="p_roll_number" class="form-input" value="${user.roll_number || ''}"></div>
      <div class="form-group"><label class="form-label">Student ID</label><input type="text" id="p_student_id" class="form-input" value="${user.student_id || ''}"></div>
      <div class="form-group"><label class="form-label">Gender</label>
        <select id="p_gender" class="form-input">
          <option value="Male" ${user.gender === 'Male' ? 'selected' : ''}>Male</option>
          <option value="Female" ${user.gender === 'Female' ? 'selected' : ''}>Female</option>
          <option value="Other" ${user.gender === 'Other' ? 'selected' : ''}>Other</option>
        </select>
      </div>
      <div class="form-group"><label class="form-label">Date of Birth</label><input type="date" id="p_dob" class="form-input" value="${user.dob || ''}"></div>
      <div class="form-group"><label class="form-label">Blood Group</label><input type="text" id="p_blood_group" class="form-input" placeholder="O+" value="${user.blood_group || ''}"></div>
      <div class="form-group"><label class="form-label">Nationality</label><input type="text" id="p_nationality" class="form-input" value="${user.nationality || 'Indian'}"></div>
    </div>
  </div>

  <div class="form-section animate-fade-in-up delay-300">
    <h3 class="form-section-title">📞 Contact Information</h3>
    <div class="form-grid">
      <div class="form-group"><label class="form-label">Personal Email</label><input type="email" id="p_personal_email" class="form-input" value="${user.personal_email || ''}"></div>
      <div class="form-group"><label class="form-label">Institutional Email</label><input type="email" class="form-input" value="${user.email || ''}" readonly></div>
      <div class="form-group"><label class="form-label">Mobile Number</label><input type="tel" id="p_mobile_number" class="form-input" value="${user.mobile_number || ''}"></div>
      <div class="form-group"><label class="form-label">Emergency Contact</label><input type="tel" id="p_emergency_contact" class="form-input" value="${user.emergency_contact || ''}"></div>
    </div>
  </div>

  <div class="form-section animate-fade-in-up delay-400">
    <h3 class="form-section-title">🏠 Address Information</h3>
    <div class="form-grid">
      <div class="form-group" style="grid-column: 1 / -1;"><label class="form-label">Permanent Address</label><input type="text" id="p_permanent_address" class="form-input" value="${user.permanent_address || ''}"></div>
      <div class="form-group" style="grid-column: 1 / -1;"><label class="form-label">Current Address</label><input type="text" id="p_current_address" class="form-input" value="${user.current_address || ''}"></div>
      <div class="form-group"><label class="form-label">City</label><input type="text" id="p_city" class="form-input" value="${user.city || ''}"></div>
      <div class="form-group"><label class="form-label">State</label><input type="text" id="p_state" class="form-input" value="${user.state || ''}"></div>
      <div class="form-group"><label class="form-label">Pincode</label><input type="text" id="p_pincode" class="form-input" value="${user.pincode || ''}"></div>
      <div class="form-group"><label class="form-label">Country</label><input type="text" id="p_country" class="form-input" value="${user.country || 'India'}"></div>
    </div>
  </div>

  <div class="form-section">
    <h3 class="form-section-title">🔗 Professional Links</h3>
    <div class="form-grid">
      <div class="form-group"><label class="form-label">LinkedIn Profile</label><input type="url" id="p_linkedin_url" class="form-input" placeholder="https://linkedin.com/in/..." value="${user.linkedin_url || ''}"></div>
      <div class="form-group"><label class="form-label">GitHub Profile</label><input type="url" id="p_github_url" class="form-input" placeholder="https://github.com/..." value="${user.github_url || ''}"></div>
      <div class="form-group"><label class="form-label">Portfolio Website</label><input type="url" id="p_portfolio_url" class="form-input" placeholder="https://..." value="${user.portfolio_url || ''}"></div>
      <div class="form-group"><label class="form-label">LeetCode / HackerRank</label><input type="url" id="p_coding_profile_url" class="form-input" value="${user.coding_profile_url || ''}"></div>
    </div>
  </div>
</div>

<!-- TAB 2: ACADEMIC DETAILS -->
<div class="profile-content" id="tab-academic">
  <div class="form-section">
    <h3 class="form-section-title">🏫 School Education (10th & 12th)</h3>
    <div class="form-grid">
      <div class="form-group"><label class="form-label">10th School Name</label><input type="text" id="a_school_10th" class="form-input" value="${user.school_10th || ''}"></div>
      <div class="form-group"><label class="form-label">10th Board</label><input type="text" id="a_board_10th" class="form-input" value="${user.board_10th || ''}"></div>
      <div class="form-group"><label class="form-label">10th % or CGPA</label><input type="text" id="a_marks_10th" class="form-input" value="${user.marks_10th || ''}"></div>
      <div class="form-group"><label class="form-label">10th Year of Passing</label><input type="text" id="a_year_10th" class="form-input" value="${user.year_10th || ''}"></div>
      
      <div class="form-group" style="margin-top:16px;"><label class="form-label">12th / Diploma College</label><input type="text" id="a_college_12th" class="form-input" value="${user.college_12th || ''}"></div>
      <div class="form-group" style="margin-top:16px;"><label class="form-label">12th Board</label><input type="text" id="a_board_12th" class="form-input" value="${user.board_12th || ''}"></div>
      <div class="form-group" style="margin-top:16px;"><label class="form-label">12th % or CGPA</label><input type="text" id="a_marks_12th" class="form-input" value="${user.marks_12th || ''}"></div>
      <div class="form-group" style="margin-top:16px;"><label class="form-label">12th Year of Passing</label><input type="text" id="a_year_12th" class="form-input" value="${user.year_12th || ''}"></div>
    </div>
  </div>

  <div class="form-section">
    <h3 class="form-section-title">🎓 College Information (UG/PG)</h3>
    <div class="form-grid">
      <div class="form-group"><label class="form-label">Degree</label>
        <select id="a_degree" class="form-input">
          <option value="B.E." ${user.degree === 'B.E.' ? 'selected' : ''}>B.E.</option>
          <option value="B.Tech" ${user.degree === 'B.Tech' ? 'selected' : ''}>B.Tech</option>
          <option value="M.E." ${user.degree === 'M.E.' ? 'selected' : ''}>M.E.</option>
          <option value="MBA" ${user.degree === 'MBA' ? 'selected' : ''}>MBA</option>
        </select>
      </div>
      <div class="form-group"><label class="form-label">Department</label><input type="text" id="a_department" class="form-input" value="${user.department || ''}"></div>
      <div class="form-group"><label class="form-label">Batch</label><input type="text" id="a_batch_year" class="form-input" value="${user.batch_year || ''}"></div>
      <div class="form-group"><label class="form-label">Current Semester</label>
        <select id="a_current_semester" class="form-input">
          ${[1,2,3,4,5,6,7,8].map(s => `<option value="${s}" ${user.current_semester == s ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
      </div>
    </div>
  </div>

  <div class="form-section">
    <h3 class="form-section-title">📈 Academic Performance</h3>
    <div class="form-grid">
      <div class="form-group"><label class="form-label">Current CGPA</label><input type="number" step="0.01" id="a_cgpa" class="form-input" value="${user.cgpa || ''}"></div>
      <div class="form-group"><label class="form-label">Total Credits Earned</label><input type="number" id="a_total_credits" class="form-input" value="${user.total_credits || ''}"></div>
      <div class="form-group"><label class="form-label">Standing Arrears</label><input type="number" id="a_arrears" class="form-input" value="${user.arrears || '0'}"></div>
      <div class="form-group"><label class="form-label">History of Arrears (Cleared)</label><input type="number" id="a_history_arrears" class="form-input" value="${user.history_arrears || '0'}"></div>
    </div>
  </div>

  <div class="form-section">
    <h3 class="form-section-title">⚡ Skills & Experience</h3>
    <div class="form-group" style="margin-bottom:16px;">
      <label class="form-label">Technical Skills (comma separated)</label>
      <input type="text" id="a_technical_skills" class="form-input" value="${user.technical_skills || (user.skills || []).join(', ')}">
    </div>
    <div class="form-group" style="margin-bottom:16px;">
      <label class="form-label">Soft Skills (comma separated)</label>
      <input type="text" id="a_soft_skills" class="form-input" placeholder="Communication, Leadership, Problem Solving" value="${user.soft_skills || ''}">
    </div>
    <div id="experience-list" style="display:flex; flex-direction:column; gap:12px; margin-bottom:16px;"></div>
    <button class="btn btn-secondary btn-sm" id="add-exp-btn">+ Add Internship / Project</button>
  </div>
</div>

<!-- TAB 3: DOCUMENTS -->
<div class="profile-content" id="tab-documents">
  
  <div class="form-section">
    <h3 class="form-section-title">🪪 Identity Documents</h3>
    <div class="doc-upload-grid">
      ${renderDocCard(user, 'College ID Card', '📄', 'Upload PDF/JPG')}
      ${renderDocCard(user, 'Aadhaar Card', '📄', 'Upload PDF/JPG')}
      ${renderDocCard(user, 'PAN Card', '📄', 'Upload PDF/JPG')}
    </div>
  </div>

  <div class="form-section">
    <h3 class="form-section-title">📚 Academic Documents</h3>
    <div class="doc-upload-grid">
      ${renderDocCard(user, '10th Marksheet', '🎓', 'Upload PDF')}
      ${renderDocCard(user, '12th Marksheet', '🎓', 'Upload PDF')}
      ${renderDocCard(user, 'Consolidated Marksheet', '🎓', 'Upload PDF')}
    </div>
  </div>

  <div class="form-section">
    <h3 class="form-section-title">💼 Placement & Skill Documents</h3>
    <div class="doc-upload-grid">
      ${renderDocCard(user, 'Primary Resume', '📝', 'resume_v1.pdf')}
      ${renderDocCard(user, 'Certificates', '🏆', 'Upload PDFs')}
      ${renderDocCard(user, 'Internship Letters', '💻', 'Upload PDFs')}
    </div>
  </div>

</div>

<!-- Experience Modal -->
<div id="exp-modal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:100; align-items:center; justify-content:center; backdrop-filter:blur(4px);">
  <div style="background:var(--bg-card); width:90%; max-width:500px; border-radius:16px; padding:24px; border:1px solid var(--border-subtle); box-shadow:0 20px 40px rgba(0,0,0,0.4);">
    <h3 style="margin-bottom:16px; font-family:var(--font-display);">Add Experience</h3>
    
    <div class="form-group" style="margin-bottom:16px;">
      <label class="form-label">Type</label>
      <select id="exp-type" class="form-input">
        <option value="internship">Internship</option>
        <option value="project">Project</option>
      </select>
    </div>

    <!-- Internship Fields -->
    <div id="exp-internship-fields" style="display:block;">
      <div class="form-group" style="margin-bottom:12px;"><label class="form-label">Company</label><input type="text" id="exp-company" class="form-input"></div>
      <div class="form-group" style="margin-bottom:12px;"><label class="form-label">Role</label><input type="text" id="exp-role" class="form-input"></div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px;">
        <div class="form-group"><label class="form-label">Start Date</label><input type="date" id="exp-start" class="form-input"></div>
        <div class="form-group"><label class="form-label">End Date</label><input type="date" id="exp-end" class="form-input"></div>
      </div>
      <div class="form-group" style="margin-bottom:12px;"><label class="form-label">Description</label><textarea id="exp-desc" class="form-input" rows="3"></textarea></div>
    </div>

    <!-- Project Fields -->
    <div id="exp-project-fields" style="display:none;">
      <div class="form-group" style="margin-bottom:12px;"><label class="form-label">Project Title</label><input type="text" id="exp-title" class="form-input"></div>
      <div class="form-group" style="margin-bottom:12px;"><label class="form-label">Tech Stack (comma separated)</label><input type="text" id="exp-tech" class="form-input"></div>
      <div class="form-group" style="margin-bottom:12px;"><label class="form-label">GitHub URL</label><input type="url" id="exp-git" class="form-input"></div>
      <div class="form-group" style="margin-bottom:12px;"><label class="form-label">Live Demo URL</label><input type="url" id="exp-demo" class="form-input"></div>
    </div>

    <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:24px;">
      <button class="btn btn-secondary" id="exp-cancel">Cancel</button>
      <button class="btn btn-primary" id="exp-save">Save Experience</button>
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
  
  let style = isUploaded ? 'border-color:var(--brand-emerald); background:rgba(16, 185, 129, 0.05); cursor:pointer;' : 'cursor:pointer;';
  let statusHtml = isUploaded 
    ? `<div style="font-size:0.75rem;color:var(--brand-emerald);margin-top:4px;" class="doc-status">✅ Uploaded successfully</div>` 
    : `<div style="font-size:0.75rem;color:var(--text-muted);margin-top:4px;" class="doc-status">${hint}</div>`;
    
  let viewHtml = isUploaded 
    ? `<a href="${url}" target="_blank" class="doc-view-link" style="font-size:0.8rem; font-weight:600; color:var(--brand-electric-violet); margin-top:12px; display:inline-block; text-decoration:none; padding:4px 12px; background:rgba(124,58,237,0.1); border-radius:12px;" onclick="event.stopPropagation()">👁️ View Document</a>` 
    : '';

  return `
  <div class="doc-card" style="${style}" data-doc-type="${key}">
    <div class="doc-icon">${isUploaded ? '✅' : icon}</div>
    <div style="font-size:0.85rem;font-weight:600;" class="doc-title">${title}</div>
    ${statusHtml}
    ${viewHtml}
  </div>`;
}

function initProfileScripts(user, Store) {
  // Tab switching logic
  const tabs = document.querySelectorAll('.profile-tab');
  const contents = document.querySelectorAll('.profile-content');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Remove active from all
      tabs.forEach(t => t.classList.remove('active'));
      contents.forEach(c => c.classList.remove('active'));

      // Add active to clicked
      tab.classList.add('active');
      const targetId = tab.getAttribute('data-tab');
      document.getElementById(targetId).classList.add('active');
    });
  });

  // Save button logic
  document.getElementById('save-profile-btn').addEventListener('click', async () => {
    const btn = document.getElementById('save-profile-btn');
    btn.textContent = 'Saving...';
    btn.disabled = true;

    try {
      if (!user.id) throw new Error("User ID is missing. Please log in again.");

      // Helper function to safely get values
      const getVal = (id) => {
        const el = document.getElementById(id);
        if (!el) {
          console.warn('Missing element:', id);
          return null;
        }
        return el.value ? el.value.trim() : null;
      };

      // Collect all data from inputs safely
      const updates = {
        // Personal
        full_name: getVal('p_full_name'),
        register_number: getVal('p_register_number'),
        roll_number: getVal('p_roll_number'),
        student_id: getVal('p_student_id'),
        gender: getVal('p_gender'),
        dob: getVal('p_dob'),
        blood_group: getVal('p_blood_group'),
        nationality: getVal('p_nationality'),
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
        github_url: getVal('p_github_url'),
        portfolio_url: getVal('p_portfolio_url'),
        coding_profile_url: getVal('p_coding_profile_url'),

        // Academic
        school_10th: getVal('a_school_10th'),
        board_10th: getVal('a_board_10th'),
        marks_10th: getVal('a_marks_10th'),
        year_10th: getVal('a_year_10th'),
        college_12th: getVal('a_college_12th'),
        board_12th: getVal('a_board_12th'),
        marks_12th: getVal('a_marks_12th'),
        year_12th: getVal('a_year_12th'),
        degree: getVal('a_degree'),
        department: getVal('a_department'),
        batch_year: getVal('a_batch_year'),
        current_semester: getVal('a_current_semester'),
        cgpa: parseFloat(getVal('a_cgpa')) || null,
        total_credits: getVal('a_total_credits'),
        arrears: parseInt(getVal('a_arrears')) || 0,
        history_arrears: getVal('a_history_arrears'),
        technical_skills: getVal('a_technical_skills'),
        soft_skills: getVal('a_soft_skills'),
        
        // Keeping backward compatibility for legacy 'skills' array
        skills: (getVal('a_technical_skills') || '').split(',').map(s => s.trim()).filter(Boolean)
      };

      console.log('Sending Profile Updates:', updates);

      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select();

      console.log('Profile Save Response:', { data, error });

      if (error) throw error;
      
      // Update global store
      Store.session.user = { ...Store.session.user, ...updates };

      alert('Profile saved successfully to Supabase!');
    } catch (err) {
      console.error('Error updating profile:', err);
      alert('Failed to save profile: ' + (err.message || 'Check console for details'));
    } finally {
      btn.textContent = 'Save Changes';
      btn.disabled = false;
    }
  });
  
  // --- Document Upload Logic ---
  // Create or reuse a hidden file input to prevent duplicate DOM elements
  let fileInput = document.getElementById('hidden-doc-upload');
  if (fileInput) {
    fileInput.remove(); // Clean up old input if we re-rendered
  }
  
  fileInput = document.createElement('input');
  fileInput.id = 'hidden-doc-upload';
  fileInput.type = 'file';
  fileInput.accept = '.pdf,.jpg,.jpeg,.png';
  fileInput.style.display = 'none';
  document.body.appendChild(fileInput);

  let currentDocType = '';

  document.querySelectorAll('.doc-card').forEach(card => {
    card.addEventListener('click', () => {
      // Get the document name from the data attribute
      currentDocType = card.getAttribute('data-doc-type') || card.querySelector('.doc-title').textContent.trim().replace(/ /g, '_').toLowerCase();
      fileInput.click();
    });
  });

  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) {
      fileInput.value = ''; // Reset if they cancelled the file picker
      return;
    }

    // Capture the type locally so it doesn't get overwritten if they click quickly
    const docTypeForThisUpload = currentDocType;

    if (file.size > 5 * 1024 * 1024) {
      alert('File is too large! Please upload a file smaller than 5MB.');
      fileInput.value = '';
      return;
    }

    try {
      console.log(`Uploading ${file.name} as ${docTypeForThisUpload}...`);
      
      // 1. Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${docTypeForThisUpload}_${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('student-documents')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // 2. Get Public URL
      const { data: publicUrlData } = supabase.storage
        .from('student-documents')
        .getPublicUrl(fileName);
        
      const fileUrl = publicUrlData.publicUrl;
      console.log('File uploaded to:', fileUrl);

      // 3. Save URL to the profiles table (documents JSONB column)
      const existingDocs = user.documents || {};
      existingDocs[docTypeForThisUpload] = fileUrl;

      const { error: dbError } = await supabase
        .from('profiles')
        .update({ documents: existingDocs })
        .eq('id', user.id);

      if (dbError) throw dbError;

      // Update local store
      Store.session.user.documents = existingDocs;
      
      alert(`${docTypeForThisUpload.replace(/_/g, ' ')} uploaded successfully!`);
      
      // Update UI to show it's uploaded
      document.querySelectorAll('.doc-card').forEach(card => {
        const type = card.getAttribute('data-doc-type') || card.querySelector('.doc-title').textContent.trim().replace(/ /g, '_').toLowerCase();
        if (type === docTypeForThisUpload) {
          card.style.borderColor = 'var(--brand-emerald)';
          card.style.background = 'rgba(16, 185, 129, 0.05)';
          card.querySelector('.doc-icon').textContent = '✅';
          
          const statusEl = card.querySelector('.doc-status') || card.children[2];
          statusEl.textContent = '✅ Uploaded successfully';
          statusEl.style.color = 'var(--brand-emerald)';
          
          let viewLink = card.querySelector('.doc-view-link');
          if (!viewLink) {
            viewLink = document.createElement('a');
            viewLink.className = 'doc-view-link';
            viewLink.style.cssText = 'font-size:0.8rem; font-weight:600; color:var(--brand-electric-violet); margin-top:12px; display:inline-block; text-decoration:none; padding:4px 12px; background:rgba(124,58,237,0.1); border-radius:12px;';
            viewLink.target = '_blank';
            viewLink.textContent = '👁️ View Document';
            viewLink.onclick = (ev) => ev.stopPropagation();
            card.appendChild(viewLink);
          }
          viewLink.href = fileUrl;
        }
      });

    } catch (err) {
      console.error('Upload error:', err);
      alert('Failed to upload file: ' + err.message);
    } finally {
      // Reset input so the same file can be selected again if needed
      fileInput.value = '';
    }
  });

  // --- Experience Modal Logic ---
  const expModal = document.getElementById('exp-modal');
  const expTypeSelect = document.getElementById('exp-type');
  const expIntFields = document.getElementById('exp-internship-fields');
  const expProjFields = document.getElementById('exp-project-fields');

  document.getElementById('add-exp-btn').addEventListener('click', () => {
    expModal.style.display = 'flex';
  });

  document.getElementById('exp-cancel').addEventListener('click', () => {
    expModal.style.display = 'none';
  });

  expTypeSelect.addEventListener('change', (e) => {
    if (e.target.value === 'internship') {
      expIntFields.style.display = 'block';
      expProjFields.style.display = 'none';
    } else {
      expIntFields.style.display = 'none';
      expProjFields.style.display = 'block';
    }
  });

  document.getElementById('exp-save').addEventListener('click', async () => {
    const type = expTypeSelect.value;
    const saveBtn = document.getElementById('exp-save');
    saveBtn.textContent = 'Saving...';
    saveBtn.disabled = true;

    try {
      console.log('Starting save for type:', type);
      console.log('User ID is:', user.id);
      
      if (!user.id) {
        throw new Error("User ID is missing! Please try refreshing the page and logging in again.");
      }

      if (type === 'internship') {
        const payload = {
          student_id: user.id,
          company: document.getElementById('exp-company').value.trim(),
          role: document.getElementById('exp-role').value.trim(),
          start_date: document.getElementById('exp-start').value || null,
          end_date: document.getElementById('exp-end').value || null,
          description: document.getElementById('exp-desc').value.trim()
        };
        console.log('Internship Payload:', payload);
        const { data, error } = await supabase.from('internships').insert(payload).select();
        console.log('Supabase Response:', { data, error });
        if (error) throw error;
      } else {
        const payload = {
          student_id: user.id,
          title: document.getElementById('exp-title').value.trim(),
          tech_stack: document.getElementById('exp-tech').value.split(',').map(s=>s.trim()).filter(Boolean),
          github_url: document.getElementById('exp-git').value.trim(),
          demo_url: document.getElementById('exp-demo').value.trim()
        };
        console.log('Project Payload:', payload);
        const { data, error } = await supabase.from('projects').insert(payload).select();
        console.log('Supabase Response:', { data, error });
        if (error) throw error;
      }
      expModal.style.display = 'none';
      alert(type + ' added successfully!');
      loadExperiences(); // Refresh list
    } catch (err) {
      console.error('CRITICAL ERROR saving experience:', err);
      alert('Error saving: ' + (err.message || JSON.stringify(err)));
    } finally {
      saveBtn.textContent = 'Save Experience';
      saveBtn.disabled = false;
    }
  });

  // Load existing experiences
  async function loadExperiences() {
    const list = document.getElementById('experience-list');
    list.innerHTML = '<div style="color:var(--text-muted);font-size:0.85rem;">Loading experiences...</div>';
    
    try {
      const { data: ints } = await supabase.from('internships').select('*').eq('student_id', user.id);
      const { data: projs } = await supabase.from('projects').select('*').eq('student_id', user.id);
      
      let html = '';
      (ints || []).forEach(i => {
        html += `<div style="background:var(--bg-input); padding:12px; border-radius:8px; border:1px solid var(--border-subtle);">
          <div style="font-weight:600;">🏢 ${i.role} at ${i.company}</div>
          <div style="font-size:0.8rem; color:var(--text-secondary); margin-top:4px;">${i.start_date || '?'} to ${i.end_date || 'Present'}</div>
        </div>`;
      });
      (projs || []).forEach(p => {
        html += `<div style="background:var(--bg-input); padding:12px; border-radius:8px; border:1px solid var(--border-subtle);">
          <div style="font-weight:600;">💻 ${p.title}</div>
          <div style="font-size:0.8rem; color:var(--text-secondary); margin-top:4px;">Tech: ${(p.tech_stack||[]).join(', ')}</div>
        </div>`;
      });

      list.innerHTML = html || '<div style="color:var(--text-muted);font-size:0.85rem;">No internships or projects added yet.</div>';
    } catch (err) {
      list.innerHTML = '<div style="color:var(--brand-red);">Error loading experiences.</div>';
    }
  }

  loadExperiences();
}
