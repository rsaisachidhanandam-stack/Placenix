import { supabase } from '../supabase.js';

export function loadAuthPage(root, Store, mode = 'login') {
  const hash = window.location.hash.replace('#','');
  const m = hash === 'signup' ? 'signup' : hash === 'otp' ? 'otp' : 'login';
  root.innerHTML = getAuthHTML(m);
  initAuth(m, Store);
}

function getAuthHTML(mode) {
  return `
<style>
.auth-shell{min-height:100vh;display:grid;grid-template-columns:1fr 1fr;background:var(--bg-primary);}
.auth-left{background:linear-gradient(135deg,rgba(124,58,237,.3) 0%,rgba(34,211,238,.15) 100%);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px;position:relative;overflow:hidden;border-right:1px solid var(--border-subtle);}
.auth-left-bg{position:absolute;inset:0;background:radial-gradient(ellipse 70% 60% at 40% 40%,rgba(124,58,237,.25) 0%,transparent 70%),radial-gradient(ellipse 50% 40% at 70% 70%,rgba(34,211,238,.15) 0%,transparent 70%);}
.auth-left-inner{position:relative;z-index:1;text-align:center;max-width:400px;}
.auth-brand-logo{width:64px;height:64px;background:var(--gradient-brand);border-radius:16px;display:flex;align-items:center;justify-content:center;font-size:32px;margin:0 auto 24px;box-shadow:var(--shadow-glow-violet);}
.auth-brand-name{font-family:var(--font-display);font-size:2rem;font-weight:800;background:var(--gradient-text);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-bottom:12px;}
.auth-brand-tag{color:var(--text-secondary);font-size:.875rem;line-height:1.6;margin-bottom:40px;}
.auth-feature-list{display:flex;flex-direction:column;gap:12px;text-align:left;}
.auth-feature{display:flex;align-items:center;gap:12px;padding:12px 16px;background:rgba(255,255,255,.04);border:1px solid var(--border-subtle);border-radius:10px;font-size:.875rem;color:var(--text-secondary);}
.auth-feature-icon{font-size:1.1rem;flex-shrink:0;}
.auth-right{display:flex;align-items:center;justify-content:center;padding:60px 40px;}
.auth-box{width:100%;max-width:440px;}
.auth-title{font-family:var(--font-display);font-size:1.75rem;font-weight:800;margin-bottom:8px;}
.auth-sub{color:var(--text-secondary);font-size:.875rem;margin-bottom:32px;}
.role-select-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:24px;}
.role-btn{padding:12px;background:var(--bg-card);border:2px solid var(--border-subtle);border-radius:10px;cursor:pointer;transition:all .2s;text-align:center;font-size:.8rem;font-weight:600;color:var(--text-secondary);}
.role-btn:hover{border-color:rgba(124,58,237,.4);color:var(--brand-violet-light);}
.role-btn.selected{border-color:var(--brand-electric-violet);background:rgba(124,58,237,.12);color:var(--brand-violet-light);}
.role-btn-icon{font-size:1.25rem;display:block;margin-bottom:4px;}
.auth-form{display:flex;flex-direction:column;gap:16px;}
.otp-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:10px;margin:24px 0;}
.otp-input{width:100%;aspect-ratio:1;text-align:center;font-size:1.25rem;font-weight:700;background:var(--bg-input);border:2px solid var(--border-input);border-radius:10px;color:var(--text-primary);outline:none;transition:all .2s;}
.otp-input:focus{border-color:var(--brand-electric-violet);background:rgba(124,58,237,.08);}
.auth-divider{display:flex;align-items:center;gap:12px;color:var(--text-muted);font-size:.8rem;margin:8px 0;}
.auth-divider::before,.auth-divider::after{content:'';flex:1;height:1px;background:var(--border-subtle);}
@media(max-width:768px){.auth-shell{grid-template-columns:1fr;}.auth-left{display:none;}.auth-right{padding:40px 24px;}}
</style>
<div class="auth-shell">
  <div class="auth-left">
    <div class="auth-left-bg"></div>
    <div class="auth-left-inner">
      <div class="auth-brand-logo">🎓</div>
      <div class="auth-brand-name">Placenix</div>
      <p class="auth-brand-tag">AI-Powered Employability &amp; Campus Recruitment Operating System</p>
      <div class="auth-feature-list">
        <div class="auth-feature"><span class="auth-feature-icon">🤖</span>AI Resume Intelligence Engine</div>
        <div class="auth-feature"><span class="auth-feature-icon">📊</span>Employability Score Analytics</div>
        <div class="auth-feature"><span class="auth-feature-icon">🎯</span>Placement Drive Automation</div>
        <div class="auth-feature"><span class="auth-feature-icon">🔀</span>Kanban Recruitment Pipeline</div>
        <div class="auth-feature"><span class="auth-feature-icon">🎓</span>Alumni Mentoring Network</div>
      </div>
    </div>
  </div>
  <div class="auth-right">
    <div class="auth-box" id="auth-box">
      ${mode === 'otp' ? renderOTP() : mode === 'signup' ? renderSignup() : renderLogin()}
    </div>
  </div>
</div>`;
}

function renderLogin() {
  return `
  <h1 class="auth-title">Welcome back 👋</h1>
  <p class="auth-sub">Sign in to your Placenix account</p>
  <div style="margin-bottom:24px;">
    <p style="font-size:.8rem;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px;">Sign in as</p>
    <div class="role-select-grid">
      ${[['👨‍🎓','Student','student'],['👨‍🏫','Faculty','faculty'],['🏢','TPO','tpo'],['👑','Admin','admin']].map(([ic,lb,v])=>
        `<div class="role-btn ${v==='student'?'selected':''}" data-role="${v}"><span class="role-btn-icon">${ic}</span>${lb}</div>`).join('')}
    </div>
  </div>
  <form class="auth-form" id="login-form">
    <div class="input-group">
      <label class="input-label">Email Address</label>
      <input class="input" type="email" id="login-email" placeholder="you@gmail.com" required>
    </div>
    <div class="input-group">
      <label class="input-label">Password</label>
      <input class="input" type="password" id="login-password" placeholder="••••••••" required>
    </div>
    <div style="display:flex;justify-content:flex-end;"><a href="#" style="font-size:.8rem;color:var(--text-link);">Forgot password?</a></div>
    <button type="submit" class="btn btn-primary" id="login-submit-btn" style="width:100%;justify-content:center;padding:13px;">Sign In →</button>
  </form>
  <div class="auth-divider">or</div>
  <p style="text-align:center;font-size:.875rem;color:var(--text-muted);">
    Don't have an account? <a href="#signup" style="color:var(--text-link);font-weight:600;">Create one</a>
  </p>`;
}

function renderSignup() {
  return `
  <h1 class="auth-title">Join Placenix 🚀</h1>
  <p class="auth-sub">Create your account to get started</p>
  <form class="auth-form" id="signup-form">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
      <div class="input-group"><label class="input-label">First Name</label><input class="input" type="text" id="signup-fname" placeholder="Arjun" required></div>
      <div class="input-group"><label class="input-label">Last Name</label><input class="input" type="text" id="signup-lname" placeholder="Mehta" required></div>
    </div>
    <div class="input-group"><label class="input-label">Institution Email</label><input class="input" type="email" id="signup-email" placeholder="you@college.ac.in" required></div>
    <div class="input-group"><label class="input-label">College / University</label><input class="input" type="text" id="signup-college" placeholder="SVCE" required></div>
    <div class="input-group">
      <label class="input-label">Role</label>
      <select class="input" id="signup-role">
        <option value="student">Student</option>
        <option value="faculty">Faculty Advisor</option>
        <option value="tpo">TPO</option>
        <option value="admin">University Admin</option>
      </select>
    </div>
    <div class="input-group"><label class="input-label">Password</label><input class="input" type="password" id="signup-password" placeholder="Create a strong password" required minlength="6"></div>
    <button type="submit" class="btn btn-primary" id="signup-submit-btn" style="width:100%;justify-content:center;padding:13px;">Create Account →</button>
  </form>
  <p style="text-align:center;font-size:.875rem;color:var(--text-muted);margin-top:16px;">
    Already have an account? <a href="#login" style="color:var(--text-link);font-weight:600;">Sign in</a>
  </p>`;
}

function renderOTP() {
  return `
  <div style="text-align:center;margin-bottom:24px;">
    <div style="width:64px;height:64px;background:rgba(34,211,238,.15);border:2px solid rgba(34,211,238,.3);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:28px;margin:0 auto 16px;">📱</div>
    <h1 class="auth-title">Verify Your Email</h1>
    <p class="auth-sub">We sent a verification link to your email</p>
  </div>
  <div style="text-align:center;">
    <p style="font-size:.875rem;color:var(--text-muted);margin-bottom:24px;">Please check your inbox and click the link to activate your account.</p>
    <button class="btn btn-primary" style="width:100%;justify-content:center;padding:13px;" onclick="window.location.hash='login'">Back to Login →</button>
  </div>`;
}

function initAuth(mode, Store) {
  let selectedRole = 'student';

  // Role select logic for login
  document.querySelectorAll('.role-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedRole = btn.getAttribute('data-role');
      console.log('Role selected:', selectedRole);
    });
  });

  // Login form handler
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async e => {
      e.preventDefault();
      const btn = document.getElementById('login-submit-btn');
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;

      console.log('Attempting login for:', email);
      
      btn.textContent = 'Signing in...';
      btn.disabled = true;

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        console.error('Supabase Login Error:', error.message);
        alert('Login failed: ' + error.message);
        btn.textContent = 'Sign In →';
        btn.disabled = false;
      } else {
        console.log('Login successful!', data.user.id);
        const role = data.user.user_metadata?.role || 'student';
        window.location.hash = role + '-dashboard';
      }
    });
  }

  // Signup form handler
  const signupForm = document.getElementById('signup-form');
  if (signupForm) {
    signupForm.addEventListener('submit', async e => {
      e.preventDefault();
      const btn = document.getElementById('signup-submit-btn');
      
      const firstName = document.getElementById('signup-fname').value.trim();
      const lastName = document.getElementById('signup-lname').value.trim();
      const email = document.getElementById('signup-email').value.trim();
      const password = document.getElementById('signup-password').value;
      const college = document.getElementById('signup-college').value.trim();
      const role = document.getElementById('signup-role').value;

      btn.textContent = 'Creating account...';
      btn.disabled = true;

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            full_name: `${firstName} ${lastName}`,
            college: college,
            role: role
          }
        }
      });

      if (error) {
        console.error('Supabase Signup Error:', error.message);
        alert('Signup failed: ' + error.message);
        btn.textContent = 'Create Account →';
        btn.disabled = false;
      } else {
        alert('Signup successful! Please check your email for a verification link.');
        window.location.hash = 'login';
      }
    });
  }
}
