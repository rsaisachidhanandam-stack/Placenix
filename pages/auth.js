// ============================================================
// PLACENIX — ENTERPRISE AUTHENTICATION WORKSPACE
// ============================================================

export function loadAuthPage(root, Store, mode = 'login', supabase) {
  const hash = window.location.hash.replace('#','');
  const m = hash === 'signup' ? 'signup' : hash === 'otp' ? 'otp' : 'login';
  root.innerHTML = getAuthHTML(m);
  initAuth(m, Store, supabase);
}

function getAuthHTML(mode) {
  return `
  <style>
    .auth-page { min-height: 100vh; display: grid; grid-template-columns: 1.1fr 0.9fr; background: #09090b; font-family: 'Inter', sans-serif; }
    
    /* Left Panel: Institutional Branding */
    .auth-visual { 
      background: #0f0f10; 
      display: flex; 
      flex-direction: column; 
      justify-content: center; 
      padding: 80px; 
      position: relative; 
      overflow: hidden;
      border-right: 1px solid rgba(255,255,255,0.05);
    }
    
    .auth-visual::before {
      content: "";
      position: absolute;
      top: -10%; right: -10%;
      width: 500px; height: 500px;
      background: radial-gradient(circle, rgba(124,58,237,0.08) 0%, transparent 70%);
      pointer-events: none;
    }

    .auth-brand { display: flex; align-items: center; gap: 12px; margin-bottom: 64px; }
    .auth-brand-logo { 
      width: 40px; height: 40px; 
      background: #7c3aed; 
      border-radius: 12px; 
      display: flex; align-items: center; justify-content: center; 
      font-size: 20px; color: white;
      box-shadow: 0 0 30px rgba(124,58,237,0.3);
    }
    .auth-brand-name { font-size: 1.5rem; font-weight: 800; color: white; letter-spacing: -0.02em; }

    .auth-hero-title { font-size: 3rem; font-weight: 800; line-height: 1.1; color: white; margin-bottom: 24px; letter-spacing: -0.04em; }
    .auth-hero-text { font-size: 1.125rem; color: #a1a1aa; line-height: 1.6; max-width: 480px; margin-bottom: 48px; }

    /* Right Panel: Workspace Access */
    .auth-form-container { display: flex; align-items: center; justify-content: center; padding: 60px; }
    .auth-box { width: 100%; max-width: 400px; }

    .auth-form-title { font-size: 1.875rem; font-weight: 800; color: white; margin-bottom: 8px; letter-spacing: -0.02em; }
    .auth-form-sub { color: #a1a1aa; font-size: 0.95rem; margin-bottom: 32px; }

    /* Enterprise Workspace Selector */
    .workspace-grid { display: grid; grid-template-columns: 1fr; gap: 12px; margin-bottom: 32px; max-height: 280px; overflow-y: auto; padding-right: 8px; }
    .workspace-grid::-webkit-scrollbar { width: 4px; }
    .workspace-grid::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }

    .workspace-card { 
      background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); 
      border-radius: 12px; padding: 12px 16px; display: flex; align-items: center; gap: 16px; 
      cursor: pointer; transition: all 0.2s; position: relative;
    }
    .workspace-card:hover { background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.1); }
    .workspace-card.active { 
      background: rgba(124,58,237,0.05); border-color: #7c3aed; 
      box-shadow: 0 0 20px rgba(124,58,237,0.1);
    }

    .workspace-icon { 
      width: 36px; height: 36px; background: rgba(255,255,255,0.03); 
      border-radius: 8px; display: flex; align-items: center; justify-content: center; 
      font-size: 18px; color: #a1a1aa; transition: all 0.2s;
    }
    .workspace-card.active .workspace-icon { background: #7c3aed; color: white; }

    .workspace-info { flex: 1; }
    .workspace-name { font-size: 0.9rem; font-weight: 700; color: #fafafa; margin-bottom: 2px; }
    .workspace-desc { font-size: 0.75rem; color: #71717a; }

    .active-indicator { 
      width: 6px; height: 6px; background: #7c3aed; border-radius: 50%; 
      position: absolute; right: 16px; opacity: 0; transition: all 0.2s;
    }
    .workspace-card.active .active-indicator { opacity: 1; transform: scale(1.2); }

    .input-wrapper { margin-bottom: 20px; }
    .input-label { display: block; font-size: 0.85rem; font-weight: 600; color: #a1a1aa; margin-bottom: 8px; }
    .auth-input { 
      width: 100%; height: 48px; background: #09090b; 
      border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; 
      padding: 0 16px; color: white; font-size: 0.95rem; transition: all 0.2s; outline: none; 
    }
    .auth-input:focus { border-color: #7c3aed; box-shadow: 0 0 0 3px rgba(124,58,237,0.1); }

    .btn-auth { 
      width: 100%; height: 48px; background: #7c3aed; color: white; 
      border: none; border-radius: 12px; font-size: 1rem; font-weight: 700; 
      cursor: pointer; transition: all 0.2s; margin-top: 12px; 
    }
    .btn-auth:hover { background: #6d28d9; transform: translateY(-1px); }

    .auth-footer { text-align: center; font-size: 0.9rem; color: #71717a; margin-top: 32px; }
    .auth-link { color: #7c3aed; font-weight: 700; cursor: pointer; }
  </style>

  <div class="auth-page">
    <div class="auth-visual">
      <div class="auth-brand">
        <div class="auth-brand-logo">🎓</div>
        <div class="auth-brand-name">Placenix</div>
      </div>
      <h2 class="auth-hero-title">Intelligent Infrastructure for Campus Placements.</h2>
      <p class="auth-hero-text">Empowering 200+ universities with AI-driven employability insights and automated recruitment workflows.</p>
      
      <!-- Placeholder for "Institutional Network" illustration -->
      <div style="margin-top:auto; padding:24px; background:rgba(255,255,255,0.03); border-radius:16px; border:1px solid rgba(255,255,255,0.05);">
        <div style="font-size:12px; color:#71717a; margin-bottom:12px; text-transform:uppercase; letter-spacing:0.1em;">Institutional Trust Metric</div>
        <div style="font-size:24px; font-weight:800; color:white;">99.8% Placement Precision</div>
        <div style="height:4px; width:100%; background:rgba(255,255,255,0.1); margin-top:12px; border-radius:2px;">
          <div style="width:99.8%; height:100%; background:#7c3aed; border-radius:2px;"></div>
        </div>
      </div>
    </div>
    
    <div class="auth-form-container">
      <div class="auth-box">
        ${mode === 'signup' ? renderSignup() : renderLogin()}
      </div>
    </div>
  </div>`;
}

function renderLogin() {
  const roles = [
    { id: 'student', name: 'Student', icon: '👤', desc: 'Personal intelligence node & career path' },
    { id: 'faculty', name: 'Faculty Advisor', icon: '👨‍🏫', desc: 'Student mentorship & academic oversight' },
    { id: 'coordinator', name: 'Dept. Coordinator', icon: '📊', desc: 'Placement ops & department telemetry' },
    { id: 'department', name: 'Department Login', icon: '🏛️', desc: 'Departmental oversight & intelligence' },
    { id: 'tpo', name: 'TPO Workspace', icon: '🏢', desc: 'Corporate relations & campus drive ops' },
    { id: 'admin', name: 'Institutional Admin', icon: '🛡️', desc: 'Global control & user authorization' }
  ];

  return `
    <h1 class="auth-form-title">Access Workspace</h1>
    <p class="auth-form-sub">Select your institutional node to begin session</p>
    
    <div class="workspace-grid">
      ${roles.map(r => `
        <div class="workspace-card ${r.id === 'student' ? 'active' : ''}" data-role="${r.id}">
          <div class="workspace-icon">${r.icon}</div>
          <div class="workspace-info">
            <div class="workspace-name">${r.name}</div>
            <div class="workspace-desc">${r.desc}</div>
          </div>
          <div class="active-indicator"></div>
        </div>
      `).join('')}
      
      <!-- Future Workspace Placeholders -->
      <div class="workspace-card" style="opacity: 0.4; cursor: not-allowed; border-style: dashed;">
        <div class="workspace-icon">💼</div>
        <div class="workspace-info">
          <div class="workspace-name">Corporate Recruiter</div>
          <div class="workspace-desc">Pipeline coming soon</div>
        </div>
      </div>
    </div>

    <form id="login-form">
      <div class="input-wrapper">
        <label class="input-label">Email Address</label>
        <input type="email" id="login-email" class="auth-input" placeholder="name@email.com" required>
      </div>
      <div class="input-wrapper">
        <div class="flex justify-between items-center" style="margin-bottom:8px;">
          <label class="input-label" style="margin-bottom:0;">Access Password</label>
          <span class="auth-link" style="font-size:12px;">Forgot password?</span>
        </div>
        <input type="password" id="login-password" class="auth-input" placeholder="••••••••" required>
      </div>
      
      <div class="flex items-center gap-2" style="margin-bottom:24px;">
        <input type="checkbox" id="remember" style="accent-color:#7c3aed;">
        <label for="remember" style="font-size:13px; color:#a1a1aa;">Keep me signed in for 30 days</label>
      </div>

      <button type="submit" class="btn-auth" id="login-submit-btn">Enter Workspace</button>
    </form>

    <p class="auth-footer">
      New to the platform? <span class="auth-link" onclick="location.hash='signup'">Register your profile</span>
    </p>`;
}

function renderSignup() {
  return `
    <h1 class="auth-form-title">Institutional Onboarding</h1>
    <p class="auth-form-sub">Create your professional profile on the university network</p>
    <form id="signup-form">
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
        <div class="input-wrapper">
          <label class="input-label">First name</label>
          <input type="text" id="signup-fname" class="auth-input" placeholder="John" required>
        </div>
        <div class="input-wrapper">
          <label class="input-label">Last name</label>
          <input type="text" id="signup-lname" class="auth-input" placeholder="Doe" required>
        </div>
      </div>
      <div class="input-wrapper">
        <label class="input-label">Email address</label>
        <input type="email" id="signup-email" class="auth-input" placeholder="name@email.com" required>
      </div>
      <div class="input-wrapper">
        <label class="input-label">Workspace Role</label>
        <select id="signup-role" class="auth-input" style="appearance:none; background-image: url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 fill=%22none%22 viewBox=%220 0 20 20%22%3E%3Cpath stroke=%22%236b7280%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22 stroke-width=%221.5%22 d=%22m6 8 4 4 4-4%22/%3E%3C/svg%3E'); background-position: right 0.5rem center; background-repeat: no-repeat; background-size: 1.5em 1.5em;">
          <option value="student">Student</option>
          <option value="faculty">Faculty Advisor</option>
          <option value="coordinator">Dept. Coordinator</option>
          <option value="department">Department Login</option>
          <option value="tpo">Training & Placement Officer</option>
          <option value="admin">Institutional Admin</option>
        </select>
      </div>
      <div class="input-wrapper">
        <label class="input-label">Secure Password</label>
        <input type="password" id="signup-password" class="auth-input" placeholder="Min. 8 characters" required minlength="8">
      </div>
      <button type="submit" class="btn-auth" id="signup-submit-btn">Begin Onboarding</button>
    </form>
    <p class="auth-footer">
      Already registered? <span class="auth-link" onclick="location.hash='login'">Access workspace</span>
    </p>`;
}

function initAuth(mode, Store, supabase) {
  let selectedRole = 'student';
  document.querySelectorAll('.workspace-card').forEach(card => {
    card.onclick = () => {
      if (card.style.opacity === '0.4') return; // Ignore placeholders
      document.querySelectorAll('.workspace-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      selectedRole = card.getAttribute('data-role');
    };
  });

  const form = document.getElementById(mode === 'signup' ? 'signup-form' : 'login-form');
  if (!form) return;

  form.onsubmit = async e => {
    e.preventDefault();
    if (!supabase) return alert('Operational system error: Supabase core missing.');
    
    const btn = document.getElementById(mode === 'signup' ? 'signup-submit-btn' : 'login-submit-btn');
    btn.disabled = true;
    btn.textContent = 'Authenticating...';

    const email = document.getElementById(mode + '-email').value.trim();
    const password = document.getElementById(mode + '-password').value;

    try {
      if (mode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        
        const userRole = data.user.user_metadata?.role || selectedRole;

        // Institutional Staff Authorization Firewall
        if (['faculty', 'coordinator', 'tpo', 'admin'].includes(userRole)) {
          console.log('🛡️ Firewall Authentication Query initiated for:', email);
          const { data: profile, error: profileErr } = await supabase
            .from('staff_profiles')
            .select('status, role')
            .eq('email', email)
            .single();

          console.log('🛡️ Firewall Diagnostics:', { profile, profileErr });

          if (profileErr || !profile || profile.status !== 'Approved') {
            await supabase.auth.signOut();
            
            // Construct highly descriptive diagnostics to pin-point server logic failures
            let reason = 'Profile missing from registry.';
            if (profileErr) reason = `Database Connection Failed: ${profileErr.message}`;
            else if (profile) reason = `Account status is currently '${profile.status}'. Needs 'Approved'.`;

            throw new Error(`Access Restricted: ${reason}`);
          }
          
          // Inherit the absolute role granted by the admin panel
          if (data.user.user_metadata) {
            data.user.user_metadata.role = profile.role;
          }
        }
        
        // Sync Store
        Store.session.user = { id: data.user.id, email: data.user.email, ...(data.user.user_metadata || {}) };
        Store.session.role = Store.session.user.role || userRole;
        
        // Redirect to Workspace
        window.location.hash = Store.session.role + '-dashboard';
      } else {
        const fname = document.getElementById('signup-fname').value.trim();
        const lname = document.getElementById('signup-lname').value.trim();
        const role = document.getElementById('signup-role').value;
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { data: { first_name: fname, last_name: lname, full_name: `${fname} ${lname}`, role } }
        });
        if (error) throw error;
        alert('Registration successful! Please check your email inbox.');
        window.location.hash = 'login';
      }
    } catch (err) {
      alert('Security Exception: ' + err.message);
      btn.disabled = false;
      btn.textContent = mode === 'signup' ? 'Begin Onboarding' : 'Enter Workspace';
    }
  };
}
