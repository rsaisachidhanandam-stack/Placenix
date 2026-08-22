export async function loadOnboardingPage(root, Store, supabase) {
  root.innerHTML = getOnboardingHTML();
  initOnboarding(Store, supabase);
}

function getOnboardingHTML() {
  return `
  <div style="min-height:100vh; background:transparent; display:flex; align-items:center; justify-content:center; padding:24px; position:relative; overflow:hidden;">
    <div style="position:absolute; inset:0; background:radial-gradient(circle at top right, rgba(124,58,237,0.1) 0%, transparent 50%), radial-gradient(circle at bottom left, rgba(34,211,238,0.05) 0%, transparent 50%);"></div>
    
    <div class="card" style="width:100%; max-width:680px; position:relative; z-index:10; padding:64px; box-shadow:0 32px 64px rgba(0,0,0,0.4);">
      <div style="text-align:center; margin-bottom:48px;">
        <div style="width:56px; height:56px; background:#fff; border-radius:16px; display:inline-flex; align-items:center; justify-content:center; overflow:hidden; box-shadow:0 8px 32px rgba(255,255,255,0.05); margin-bottom:24px;">
          <img src="logo.png" style="width:100%; height:100%; object-fit:cover; object-position:50% 15%;">
        </div>
        <h1 style="font-size:28px; font-weight:800; color:var(--text-main);">Institutional Onboarding</h1>
        <p style="font-size:14px; color:var(--text-description); margin-top:8px;">Initialize your professional identity within the Placenix ecosystem.</p>
      </div>

      <div style="display:flex; gap:12px; justify-content:center; margin-bottom:56px;">
        ${[1,2,3,4].map(i => `<div class="step-indicator" id="dot-${i}" style="width:48px; height:4px; background:rgba(255,255,255,0.05); border-radius:2px; transition:all 0.3s;"></div>`).join('')}
      </div>

      <div id="step-1" class="onboard-step">
        <h3 style="font-size:18px; font-weight:700; color:var(--text-main); margin-bottom:24px;">Academic Registry</h3>
        <div class="input-group">
          <label class="label">Major / Department</label>
          <select class="input" id="ob-dept">
            <option value="Computer Science">Computer Science & Engineering</option>
            <option value="Information Technology">Information Technology</option>
            <option value="Electronics">Electronics & Communication</option>
            <option value="Mechanical">Mechanical Engineering</option>
          </select>
        </div>
        <div class="grid grid-cols-2" style="margin-top:16px;">
          <div class="input-group"><label class="label">Graduation Batch</label><input type="text" id="ob-batch" class="input" value="2026"></div>
          <div class="input-group"><label class="label">Assigned Section</label><input type="text" id="ob-section" class="input" placeholder="e.g. B"></div>
        </div>
      </div>

      <div id="step-2" class="onboard-step" style="display:none;">
        <h3 style="font-size:18px; font-weight:700; color:var(--text-main); margin-bottom:24px;">Institutional Standing</h3>
        <div class="grid grid-cols-2">
          <div class="input-group"><label class="label">Institutional Roll No.</label><input type="text" id="ob-roll" class="input" placeholder="e.g. 22CS104"></div>
          <div class="input-group"><label class="label">Verification ID</label><input type="text" id="ob-sid" class="input" placeholder="e.g. SID-9920"></div>
        </div>
        <div class="grid grid-cols-2" style="margin-top:16px;">
          <div class="input-group"><label class="label">Current CGPA</label><input type="number" step="0.01" id="ob-cgpa" class="input" placeholder="0.00"></div>
          <div class="input-group"><label class="label">Active Arrears</label><input type="number" id="ob-arrears" class="input" value="0"></div>
        </div>
      </div>

      <div id="step-3" class="onboard-step" style="display:none;">
        <h3 style="font-size:18px; font-weight:700; color:var(--text-main); margin-bottom:24px;">Core Competencies</h3>
        <div class="flex gap-2" style="flex-wrap:wrap;">
          ${['React', 'Node.js', 'Python', 'AWS', 'Java', 'Algorithms', 'System Design', 'SQL', 'Machine Learning'].map(s => 
            `<div class="skill-node" data-skill="${s}" style="padding:8px 16px; background:rgba(255,255,255,0.03); border:1px solid var(--border-subtle); border-radius:8px; font-size:12px; font-weight:600; color:var(--text-description); cursor:pointer; transition:all 0.2s;">${s}</div>`
          ).join('')}
        </div>
      </div>

      <div id="step-4" class="onboard-step" style="display:none;">
        <h3 style="font-size:18px; font-weight:700; color:var(--text-main); margin-bottom:24px;">Professional Objectives</h3>
        <div class="input-group">
          <label class="label">Primary Career Interest</label>
          <select class="input" id="ob-interest">
            <option value="Software Engineer">Software Engineering</option>
            <option value="Data Scientist">Data Intelligence</option>
            <option value="Product Manager">Product Strategy</option>
          </select>
        </div>
        <div class="input-group" style="margin-top:16px;">
          <label class="label">Compensation Goal (LPA)</label>
          <select class="input" id="ob-goal">
            <option value="10-15">10 - 15 LPA</option>
            <option value="15-25">15 - 25 LPA</option>
            <option value="25+">25+ LPA (Elite)</option>
          </select>
        </div>
      </div>

      <div class="flex justify-between items-center" style="margin-top:48px; padding-top:32px; border-top:1px solid var(--border-subtle);">
        <button id="ob-prev" class="btn btn-secondary" style="visibility:hidden;">Previous Node</button>
        <button id="ob-next" class="btn btn-primary" style="height:48px; padding:0 32px;">Proceed to Next Node →</button>
      </div>
    </div>
  </div>

  <style>
    .skill-node.selected { background: var(--brand-primary) !important; color: white !important; border-color: var(--brand-primary) !important; box-shadow: 0 4px 12px rgba(124,58,237,0.3); }
    .step-indicator.active { background: var(--brand-primary) !important; width: 80px !important; }
    .step-indicator.completed { background: var(--success) !important; opacity: 0.5; }
  </style>
  `;
}

function initOnboarding(Store) {
  let step = 1;
  const nextBtn = document.getElementById('ob-next');
  const prevBtn = document.getElementById('ob-prev');

  document.querySelectorAll('.skill-node').forEach(node => {
    node.onclick = () => node.classList.toggle('selected');
  });

  function update() {
    document.querySelectorAll('.onboard-step').forEach((s, i) => s.style.display = (i+1 === step) ? 'block' : 'none');
    document.querySelectorAll('.step-indicator').forEach((d, i) => {
      d.className = 'step-indicator';
      if (i+1 === step) d.classList.add('active');
      else if (i+1 < step) d.classList.add('completed');
    });
    prevBtn.style.visibility = (step === 1) ? 'hidden' : 'visible';
    nextBtn.textContent = (step === 4) ? 'Finalize Identity 🚀' : 'Proceed to Next Node →';
  }

  nextBtn.onclick = async () => {
    if (step < 4) {
      step++;
      update();
    } else {
      nextBtn.disabled = true;
      nextBtn.textContent = 'Committing Registry...';
      const skills = Array.from(document.querySelectorAll('.skill-node.selected')).map(n => n.getAttribute('data-skill'));
      const payload = {
        department: document.getElementById('ob-dept').value,
        batch_year: document.getElementById('ob-batch').value,
        section: document.getElementById('ob-section').value,
        roll_number: document.getElementById('ob-roll').value,
        student_id: document.getElementById('ob-sid').value,
        cgpa: parseFloat(document.getElementById('ob-cgpa').value) || null,
        arrears: parseInt(document.getElementById('ob-arrears').value) || 0,
        skills,
        career_interests: [document.getElementById('ob-interest').value],
        placement_goal: document.getElementById('ob-goal').value,
        onboarding_complete: true
      };
      try {
        await supabase.from('profiles').update(payload).eq('id', Store.session.user.id);
        Store.session.user = { ...Store.session.user, ...payload };
        window.location.hash = 'student-dashboard';
      } catch (e) { 
        alert("Registry Error: " + e.message);
        nextBtn.disabled = false;
        nextBtn.textContent = 'Finalize Identity 🚀';
      }
    }
  };

  prevBtn.onclick = () => {
    if (step > 1) {
      step--;
      update();
    }
  };

  update();
}
