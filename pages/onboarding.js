import { supabase } from '../supabase.js';

export async function loadOnboardingPage(root, Store) {
  root.innerHTML = getOnboardingHTML();
  initOnboarding(Store);
}

function getOnboardingHTML() {
  return `
<style>
.onboard-shell {
  min-height: 100vh;
  background: var(--bg-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}
.onboard-bg {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 50% 0%, rgba(124,58,237,0.15) 0%, transparent 60%);
}
.onboard-container {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 600px;
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: 24px;
  padding: 40px;
  box-shadow: 0 20px 40px rgba(0,0,0,0.4);
  backdrop-filter: blur(20px);
}
.onboard-header {
  text-align: center;
  margin-bottom: 32px;
}
.onboard-title {
  font-family: var(--font-display);
  font-size: 2rem;
  font-weight: 800;
  margin-bottom: 8px;
}
.onboard-subtitle {
  color: var(--text-secondary);
  font-size: 0.95rem;
}
.stepper {
  display: flex;
  gap: 8px;
  margin-bottom: 40px;
  justify-content: center;
}
.step-dot {
  width: 40px;
  height: 6px;
  background: rgba(255,255,255,0.1);
  border-radius: 99px;
  transition: all 0.3s;
}
.step-dot.active {
  background: var(--gradient-brand);
}
.step-dot.completed {
  background: var(--brand-electric-violet);
  opacity: 0.6;
}
.step-panel {
  display: none;
  animation: fadeIn 0.4s ease;
}
.step-panel.active {
  display: block;
}
.onboard-nav {
  display: flex;
  justify-content: space-between;
  margin-top: 40px;
  padding-top: 24px;
  border-top: 1px solid var(--border-subtle);
}
.skill-chip {
  display: inline-flex;
  align-items: center;
  padding: 8px 16px;
  background: var(--bg-input);
  border: 1px solid var(--border-input);
  border-radius: 99px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
}
.skill-chip.selected {
  background: rgba(124,58,237,0.15);
  border-color: var(--brand-electric-violet);
  color: var(--brand-violet-light);
}
.skill-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
</style>

<div class="onboard-shell">
  <div class="onboard-bg"></div>
  <div class="onboard-container">
    
    <div class="stepper" id="onboard-stepper">
      <div class="step-dot active"></div>
      <div class="step-dot"></div>
      <div class="step-dot"></div>
      <div class="step-dot"></div>
    </div>

    <!-- Step 1: Academic -->
    <div class="step-panel active" id="step-1">
      <div class="onboard-header">
        <h2 class="onboard-title">Academic Details 🎓</h2>
        <p class="onboard-subtitle">Let's set up your university profile.</p>
      </div>
      <div style="display:grid;gap:16px;">
        <div class="input-group">
          <label class="input-label">Department</label>
          <select class="input" id="ob-dept">
            <option value="Computer Science">Computer Science</option>
            <option value="Information Technology">Information Technology</option>
            <option value="Electronics">Electronics</option>
            <option value="Mechanical">Mechanical</option>
          </select>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
          <div class="input-group">
            <label class="input-label">Batch Year (Graduation)</label>
            <input type="text" class="input" id="ob-batch" placeholder="2025" value="2025">
          </div>
          <div class="input-group">
            <label class="input-label">Section</label>
            <input type="text" class="input" id="ob-section" placeholder="A" value="A">
          </div>
        </div>
      </div>
    </div>

    <!-- Step 2: Identity & Grades -->
    <div class="step-panel" id="step-2">
      <div class="onboard-header">
        <h2 class="onboard-title">Current Standing 📊</h2>
        <p class="onboard-subtitle">This helps match you with eligible placement drives.</p>
      </div>
      <div style="display:grid;gap:16px;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
          <div class="input-group">
            <label class="input-label">Roll Number</label>
            <input type="text" class="input" id="ob-roll" placeholder="e.g. 21CS001">
          </div>
          <div class="input-group">
            <label class="input-label">Student ID</label>
            <input type="text" class="input" id="ob-sid" placeholder="e.g. S123456">
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
          <div class="input-group">
            <label class="input-label">Current CGPA</label>
            <input type="number" step="0.01" class="input" id="ob-cgpa" placeholder="8.5">
          </div>
          <div class="input-group">
            <label class="input-label">Active Arrears</label>
            <input type="number" class="input" id="ob-arrears" placeholder="0" value="0">
          </div>
        </div>
      </div>
    </div>

    <!-- Step 3: Skills -->
    <div class="step-panel" id="step-3">
      <div class="onboard-header">
        <h2 class="onboard-title">Top Skills ⚡</h2>
        <p class="onboard-subtitle">Select the skills you are most confident in.</p>
      </div>
      <div class="skill-grid" id="ob-skills">
        ${['JavaScript', 'Python', 'Java', 'C++', 'React', 'Node.js', 'SQL', 'MongoDB', 'AWS', 'Machine Learning', 'Data Structures', 'System Design'].map(s => 
          `<div class="skill-chip" data-skill="${s}">${s}</div>`
        ).join('')}
      </div>
    </div>

    <!-- Step 4: Goals -->
    <div class="step-panel" id="step-4">
      <div class="onboard-header">
        <h2 class="onboard-title">Placement Goal 🎯</h2>
        <p class="onboard-subtitle">What kind of role are you aiming for?</p>
      </div>
      <div class="input-group">
        <label class="input-label">Primary Career Interest</label>
        <select class="input" id="ob-interest">
          <option value="Software Engineer">Software Engineer</option>
          <option value="Data Scientist">Data Scientist</option>
          <option value="Product Manager">Product Manager</option>
          <option value="Core Engineering">Core Engineering</option>
        </select>
      </div>
      <div class="input-group" style="margin-top:16px;">
        <label class="input-label">Target Package (LPA)</label>
        <select class="input" id="ob-goal">
          <option value="3-5">3 - 5 LPA</option>
          <option value="6-9">6 - 9 LPA</option>
          <option value="10-15">10 - 15 LPA</option>
          <option value="15+">15+ LPA</option>
        </select>
      </div>
    </div>

    <!-- Navigation -->
    <div class="onboard-nav">
      <button class="btn btn-secondary" id="ob-prev" style="visibility:hidden;">← Back</button>
      <button class="btn btn-primary" id="ob-next">Next Step →</button>
    </div>

  </div>
</div>`;
}

function initOnboarding(Store) {
  let currentStep = 1;
  const totalSteps = 4;
  
  const nextBtn = document.getElementById('ob-next');
  const prevBtn = document.getElementById('ob-prev');
  const panels = document.querySelectorAll('.step-panel');
  const dots = document.querySelectorAll('.step-dot');
  
  // Skill chip toggling
  document.querySelectorAll('.skill-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      chip.classList.toggle('selected');
    });
  });

  function updateUI() {
    panels.forEach((p, i) => {
      p.classList.toggle('active', i + 1 === currentStep);
    });
    dots.forEach((d, i) => {
      d.classList.toggle('active', i + 1 === currentStep);
      d.classList.toggle('completed', i + 1 < currentStep);
    });
    
    prevBtn.style.visibility = currentStep === 1 ? 'hidden' : 'visible';
    
    if (currentStep === totalSteps) {
      nextBtn.textContent = 'Complete Profile 🚀';
    } else {
      nextBtn.textContent = 'Next Step →';
    }
  }

  nextBtn.addEventListener('click', async () => {
    if (currentStep < totalSteps) {
      currentStep++;
      updateUI();
    } else {
      // Finish Onboarding - Save to Supabase
      nextBtn.textContent = 'Saving...';
      nextBtn.disabled = true;

      // Gather Data
      const selectedSkills = Array.from(document.querySelectorAll('.skill-chip.selected')).map(c => c.getAttribute('data-skill'));
      
      const payload = {
        department: document.getElementById('ob-dept').value,
        batch_year: document.getElementById('ob-batch').value,
        section: document.getElementById('ob-section').value,
        roll_number: document.getElementById('ob-roll').value,
        student_id: document.getElementById('ob-sid').value,
        cgpa: parseFloat(document.getElementById('ob-cgpa').value) || null,
        arrears: parseInt(document.getElementById('ob-arrears').value) || 0,
        skills: selectedSkills,
        career_interests: [document.getElementById('ob-interest').value],
        placement_goal: document.getElementById('ob-goal').value,
        onboarding_complete: true
      };

      try {
        const { error } = await supabase
          .from('profiles')
          .update(payload)
          .eq('id', Store.session.user.id);

        if (error) throw error;
        
        // Update local store
        Store.session.user = { ...Store.session.user, ...payload };
        
        // Redirect to dashboard
        window.location.hash = 'student-dashboard';
        
      } catch (err) {
        alert('Error saving profile: ' + err.message);
        nextBtn.textContent = 'Complete Profile 🚀';
        nextBtn.disabled = false;
      }
    }
  });

  prevBtn.addEventListener('click', () => {
    if (currentStep > 1) {
      currentStep--;
      updateUI();
    }
  });
}
