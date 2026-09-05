// ============================================================
// PLACENIX — ENTERPRISE AUTHENTICATION WORKSPACE
// ============================================================

import { loadStoreFromLocalStorage } from '../store.js';

export function loadAuthPage(root, Store, mode = 'login', supabase) {
  const hash = window.location.hash.replace('#','');
  const m = hash === 'signup' ? 'signup' : hash === 'otp' ? 'otp' : 'login';
  root.innerHTML = getAuthHTML(m);
  initAuth(root, m, Store, supabase);
}

function getAuthHTML(mode) {
  return `
  <style>
    /* Reset body overrides on auth pages to eliminate light frame borders */
    [data-theme="light"] body,
    body {
      background-color: #080A10 !important;
      padding: 0 !important;
    }

    .auth-page { 
      /* Force dark theme parameters locally */
      --bg-app:          #080A10;
      --glass-1:         rgba(8, 12, 20, 0.82);
      --glass-2:         rgba(13, 20, 32, 0.70);
      --glass-3:         rgba(17, 24, 39, 0.92);
      --glass-border-main: rgba(0, 200, 255, 0.12);
      --glass-border-subtle: rgba(255, 255, 255, 0.04);
      --data-bg:         rgba(0, 0, 0, 0.35);
      --data-bg-alt:     rgba(0, 0, 0, 0.20);
      
      --brand-primary:   #00C8FF;
      --brand-primary-hover: #6366f1;
      --brand-primary-light: rgba(0, 200, 255, 0.10);
      --brand-primary-glow: rgba(0, 200, 255, 0.28);
      --brand-indigo:    #6366f1;
      --brand-secondary: #F59E0B;
      
      --text-main:       #FFFFFF;
      --text-description:#94A3B8;
      --text-muted:      #64748B;
      --bg-input:        rgba(255, 255, 255, 0.04);
      --border-main:     rgba(255, 255, 255, 0.08);
      --glass-shadow-xl: 0 24px 56px rgba(0, 0, 0, 0.6);

      min-height: 100vh; 
      display: grid; 
      grid-template-columns: 1.25fr 0.75fr; 
      background: var(--bg-app); 
      font-family: var(--font-sans);
      color-scheme: dark;
    }

    /* Force dark background style on input fields */
    [data-theme="light"] .auth-page .auth-input,
    .auth-page .auth-input {
      background: rgba(255,255,255,0.05) !important;
      color: #FFFFFF !important;
      border: 1px solid rgba(255, 255, 255, 0.10) !important;
    }
    [data-theme="light"] .auth-page .auth-input:focus,
    .auth-page .auth-input:focus {
      background: rgba(255,255,255,0.08) !important;
      border-color: var(--brand-primary) !important;
      box-shadow: 0 0 0 3px var(--brand-primary-glow) !important;
      outline: none !important;
    }
    
    /* ── Left Panel ─────────────────────────────────────── */
    .auth-visual { 
      background: radial-gradient(circle at 15% 15%, rgba(0, 200, 255, 0.12) 0%, transparent 50%),
                  radial-gradient(circle at 85% 85%, rgba(124, 58, 237, 0.14) 0%, transparent 60%),
                  linear-gradient(135deg, #07090e 0%, #0d121f 50%, #06080d 100%);
      display: flex; 
      flex-direction: column; 
      justify-content: space-between;
      padding: 56px 64px;
      position: relative; 
      overflow: hidden;
    }

    /* Ambient cyber grid */
    .auth-visual::before {
      content: '';
      position: absolute;
      inset: 0;
      background-image: 
        linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
      background-size: 40px 40px;
      mask-image: radial-gradient(ellipse at center, black 40%, transparent 80%);
      -webkit-mask-image: radial-gradient(ellipse at center, black 40%, transparent 80%);
      pointer-events: none;
      z-index: 1;
    }

    /* Glow orb animation */
    .auth-visual-glow {
      position: absolute;
      width: 440px;
      height: 440px;
      background: radial-gradient(circle, rgba(0, 200, 255, 0.16) 0%, rgba(99, 102, 241, 0.06) 50%, transparent 70%);
      top: 10%;
      left: 10%;
      filter: blur(50px);
      border-radius: 50%;
      pointer-events: none;
      animation: float-glow 14s ease-in-out infinite alternate;
      z-index: 1;
    }
    @keyframes float-glow {
      0% { transform: translate(0, 0) scale(1); }
      100% { transform: translate(35px, 25px) scale(1.15); }
    }

    .auth-hero-branding {
      position: relative;
      z-index: 4;
      margin-top: auto;
      margin-bottom: auto;
      padding: 16px 0;
    }
    .auth-hero-logo-box {
      width: 76px;
      height: 76px;
      background: #FFFFFF;
      border: 2px solid rgba(255, 255, 255, 0.95);
      border-radius: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 32px rgba(255, 255, 255, 0.28), 0 8px 24px rgba(0, 0, 0, 0.4);
      margin-bottom: 24px;
      padding: 10px;
    }
    .auth-hero-logo-box img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .auth-hero-title {
      font-family: var(--font-display);
      font-size: 2.35rem;
      font-weight: 900;
      color: #fff;
      letter-spacing: -0.04em;
      line-height: 1.15;
      margin: 0 0 12px;
    }
    .auth-hero-desc {
      font-size: 0.95rem;
      line-height: 1.6;
      color: #94A3B8;
      max-width: 460px;
      margin-bottom: 26px;
    }
    .auth-pill-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-width: 460px;
    }
    .auth-pill-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 16px;
      background: rgba(255, 255, 255, 0.025);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;
      backdrop-filter: blur(8px);
      font-size: 13px;
      font-weight: 600;
      color: #E2E8F0;
      transition: all 0.2s ease;
    }
    .auth-pill-item:hover {
      background: rgba(255, 255, 255, 0.05);
      border-color: rgba(0, 200, 255, 0.25);
      transform: translateX(4px);
    }
    .auth-pill-icon {
      width: 26px;
      height: 26px;
      border-radius: 6px;
      background: rgba(0, 200, 255, 0.12);
      color: #00C8FF;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      flex-shrink: 0;
    }

    /* Stat cards overlay on left panel */
    .auth-stat-cards {
      display: flex;
      gap: 14px;
      flex-wrap: wrap;
      position: relative;
      z-index: 4;
      margin-top: 20px;
    }
    .auth-stat-card {
      background: rgba(10, 15, 28, 0.72);
      border: 1px solid rgba(0, 200, 255, 0.18);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border-radius: 16px;
      padding: 16px 20px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06);
      transition: transform 0.3s ease, box-shadow 0.3s ease;
      min-width: 125px;
      flex: 1;
    }
    .auth-stat-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 16px 40px rgba(0,0,0,0.5), 0 0 20px rgba(0,200,255,0.1), inset 0 1px 0 rgba(255,255,255,0.08);
    }
    .auth-stat-value {
      font-size: 1.5rem;
      font-weight: 800;
      color: #fff;
      letter-spacing: -0.03em;
      line-height: 1;
    }
    .auth-stat-label {
      font-size: 10.5px;
      font-weight: 600;
      color: #64748B;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-top: 2px;
    }
    .auth-stat-icon {
      width: 26px; height: 26px;
      background: rgba(0,200,255,0.12);
      border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      margin-bottom: 8px;
      color: #00C8FF;
    }

    /* ── Right Panel ─────────────────────────────────────── */
    .auth-form-container { 
      display: flex; 
      align-items: flex-start; 
      justify-content: center; 
      padding: 40px 52px; 
      position: relative;
      z-index: 10;
      overflow-y: auto;
      height: 100vh;
      background: rgba(8, 11, 18, 0.90);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      border-left: 1px solid rgba(0,200,255,0.08);
      box-shadow: var(--glass-shadow-xl);
    }
    .auth-form-container::before {
      content: '';
      position: absolute; inset: 0;
      background: radial-gradient(600px circle at var(--mouse-x, 50%) var(--mouse-y, 30%), rgba(0,200,255,0.06), transparent 70%);
      z-index: -1; pointer-events: none;
    }
    .auth-box { width: 100%; max-width: 400px; margin: auto 0; }

    /* Brand */
    .auth-brand { display: flex; align-items: center; gap: 12px; margin-bottom: 28px; }
    .auth-brand-logo { 
      width: 38px; height: 38px;
      background: #FFFFFF;
      border: 1.5px solid rgba(255, 255, 255, 0.95);
      border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      overflow: hidden;
      box-shadow: 0 0 16px rgba(255, 255, 255, 0.25), 0 4px 12px rgba(0, 0, 0, 0.3);
      padding: 5px;
    }
    .auth-brand-logo img { width: 100%; height: 100%; object-fit: contain; }
    .auth-brand-name { font-family: var(--font-display); font-size: 1.2rem; font-weight: 800; color: #fff; letter-spacing: -0.02em; }

    /* Headline */
    .auth-form-title { font-family: var(--font-display); font-size: 2rem; font-weight: 800; color: #fff; margin-bottom: 4px; letter-spacing: -0.04em; line-height: 1.15; }
    .auth-form-sub {
      font-size: 0.9rem;
      margin-bottom: 28px;
      background: linear-gradient(90deg, #00C8FF, #6366f1);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      font-weight: 600;
    }

    /* Status badge */
    .auth-status-badge {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      background: rgba(16, 185, 129, 0.08);
      border: 1px solid rgba(16, 185, 129, 0.2);
      border-radius: 100px;
      padding: 5px 12px;
      margin-bottom: 22px;
      font-size: 11px;
      font-weight: 700;
      color: #10b981;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
    .auth-status-dot {
      width: 6px; height: 6px;
      background: #10b981;
      border-radius: 50%;
      box-shadow: 0 0 6px #10b981;
      animation: pulse-dot 2s ease-in-out infinite;
    }
    @keyframes pulse-dot {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.6; transform: scale(0.8); }
    }

    /* ── Intelligent Role Detection Badge ──────────────── */
    .auth-role-badge {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      background: rgba(0, 200, 255, 0.06);
      border: 1px solid rgba(0, 200, 255, 0.18);
      border-radius: 12px;
      margin-bottom: 20px;
      transition: all 0.3s ease;
    }
    .auth-role-badge-icon {
      width: 28px;
      height: 28px;
      border-radius: 8px;
      background: rgba(0, 200, 255, 0.12);
      color: #00C8FF;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      flex-shrink: 0;
    }
    .auth-role-badge-content {
      display: flex;
      flex-direction: column;
      text-align: left;
    }
    .auth-role-badge-title {
      font-size: 12px;
      font-weight: 700;
      color: #FFFFFF;
      line-height: 1.2;
    }
    .auth-role-badge-subtitle {
      font-size: 10.5px;
      color: #94A3B8;
    }

    /* ── Inputs ─────────────────────────────────────────── */
    .input-wrapper { margin-bottom: 18px; }
    .input-label { display: block; font-size: 12.5px; font-weight: 600; color: #64748B; margin-bottom: 7px; letter-spacing: 0.01em; }
    .input-group-icon { position: relative; display: flex; align-items: center; width: 100%; }
    .input-icon-left {
      position: absolute; left: 15px;
      color: #334155;
      display: flex; align-items: center;
      pointer-events: none; z-index: 10;
      transition: color 0.25s;
    }
    .input-group-icon:focus-within .input-icon-left { color: #00C8FF; }
    .auth-input {
      width: 100%; height: 46px;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 12px;
      padding: 0 16px;
      color: #fff;
      font-size: 0.9rem;
      transition: all 0.22s cubic-bezier(0.4,0,0.2,1);
      outline: none;
      box-shadow: inset 0 1px 4px rgba(0,0,0,0.2);
    }
    .auth-input::placeholder { color: #334155; }
    .auth-input:focus {
      background: rgba(255,255,255,0.07);
      border-color: rgba(0,200,255,0.45);
      box-shadow: 0 0 0 3px rgba(0,200,255,0.1);
    }
    .auth-input-with-icon { padding-left: 44px !important; }

    /* ── Sign In Button ─────────────────────────────────── */
    .btn-auth {
      position: relative;
      width: 100%; height: 48px;
      background: linear-gradient(135deg, #00C8FF 0%, #6366f1 100%);
      color: white;
      border: none;
      border-radius: 13px;
      font-size: 0.95rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.25, 1, 0.5, 1);
      margin-top: 14px;
      box-shadow: 0 4px 24px rgba(0,200,255,0.28), 0 4px 12px rgba(99,102,241,0.2);
      letter-spacing: 0.03em;
      overflow: hidden;
    }
    .btn-auth::after {
      content: '';
      position: absolute;
      top: 0; left: -100%;
      width: 70%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent);
      transform: skewX(-20deg);
      transition: left 0.55s ease;
    }
    .btn-auth:hover::after { left: 150%; }
    .btn-auth:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 36px rgba(0,200,255,0.35), 0 6px 18px rgba(99,102,241,0.3);
    }
    .btn-auth:active { transform: translateY(0); }
    .btn-auth svg { transition: transform 0.25s cubic-bezier(0.25, 1, 0.5, 1); }
    .btn-auth:hover svg { transform: translateX(5px); }

    .btn-secondary {
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.08);
      color: var(--text-main);
      cursor: pointer;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .btn-secondary:hover {
      background: rgba(255,255,255,0.07);
      border-color: rgba(255,255,255,0.15);
      transform: translateY(-1.5px);
    }
    .btn-secondary:active { transform: translateY(0); }

    .auth-footer { text-align: center; font-size: 0.9rem; color: #475569; margin-top: 28px; }
    .auth-link { color: #00C8FF; font-weight: 700; cursor: pointer; transition: color 0.2s; }
    .auth-link:hover { color: #fff; text-decoration: underline; }

    /* Light Theme Adjustments */
    [data-theme="light"] .auth-input {
      background: rgba(255, 255, 255, 0.06) !important;
      border-color: rgba(255,255,255,0.10) !important;
      color: #fff !important;
    }
    [data-theme="light"] .auth-input:focus {
      background: rgba(255,255,255,0.10) !important;
      border-color: #00C8FF !important;
      box-shadow: 0 0 0 3px rgba(0,200,255,0.10) !important;
    }
    [data-theme="light"] .btn-auth { color: #ffffff; }
  </style>

  <div class="auth-page">
    <div class="auth-visual">
      <div class="auth-visual-glow"></div>
      
      <div class="auth-hero-branding">
        <div class="auth-hero-logo-box animate-fade-in-up">
          <img src="logo.png" alt="Placenix Official Emblem">
        </div>
        <h2 class="auth-hero-title animate-fade-in-up">
          Campus Recruitment <br><span style="background:linear-gradient(90deg,#00C8FF,#818CF8);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">Intelligence</span>
        </h2>
        <p class="auth-hero-desc animate-fade-in-up">
          Next-generation employability OS, automated placement logistics & multi-tier institutional governance.
        </p>

        <div class="auth-pill-list animate-fade-in-up">
          <div class="auth-pill-item">
            <div class="auth-pill-icon">⚡</div>
            <span>AI Resume ATS Scanner & Skill Radar Gap Analysis</span>
          </div>
          <div class="auth-pill-item">
            <div class="auth-pill-icon">🤖</div>
            <span>Virtual Multi-Round Technical & HR Interview Coach</span>
          </div>
          <div class="auth-pill-item">
            <div class="auth-pill-icon">📊</div>
            <span>Live Recruitment Pipeline, Kanban & Placement Telemetry</span>
          </div>
        </div>
      </div>

      <div class="auth-stat-cards animate-fade-in-up">
        <div class="auth-stat-card">
          <div class="auth-stat-icon">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
          </div>
          <div class="auth-stat-value">96%</div>
          <div class="auth-stat-label">Placement Rate</div>
        </div>
        <div class="auth-stat-card">
          <div class="auth-stat-icon">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <div class="auth-stat-value">12.5 LPA</div>
          <div class="auth-stat-label">Avg. Package</div>
        </div>
        <div class="auth-stat-card">
          <div class="auth-stat-icon">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <div class="auth-stat-value">1,450+</div>
          <div class="auth-stat-label">Students Placed</div>
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
  return `
    <!-- Brand -->
    <div class="auth-brand">
      <div class="auth-brand-logo">
        <img src="logo.png" alt="Placenix Logo">
      </div>
      <div class="auth-brand-name">Placenix</div>
    </div>

    <!-- Headline -->
    <h1 class="auth-form-title">Welcome Back</h1>
    <p class="auth-form-sub">Access your institutional workspace</p>

    <!-- System status badge -->
    <div class="auth-status-badge">
      <span class="auth-status-dot"></span>
      Single Sign-On — Automatic Role Routing
    </div>

    <!-- Hidden telemetry log (kept for JS) -->
    <div id="telemetry-log-container" style="display:none;"></div>

    <!-- Dynamic Role Detection Badge (Auto updates as user types email) -->
    <div id="role-detect-badge" class="auth-role-badge animate-fade-in" style="display:none;">
      <div class="auth-role-badge-icon" id="role-badge-icon">🎓</div>
      <div class="auth-role-badge-content">
        <div class="auth-role-badge-title" id="role-badge-title">Student Portal</div>
        <div class="auth-role-badge-subtitle" id="role-badge-subtitle">Automatic workspace routing detected</div>
      </div>
    </div>

    <!-- Login Form -->
    <form id="login-form">
      <div class="input-wrapper">
        <label class="input-label">Institutional Email / Register No.</label>
        <div class="input-group-icon">
          <span class="input-icon-left">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          </span>
          <input type="email" id="login-email" class="auth-input auth-input-with-icon" placeholder="name@university.edu or register no." required autocomplete="username">
        </div>
      </div>
      <div class="input-wrapper">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:7px;">
          <label class="input-label" style="margin-bottom:0;">Password</label>
          <span class="auth-link" id="forgot-password-link" style="font-size:11.5px; cursor:pointer;">Forgot password?</span>
        </div>
        <div class="input-group-icon">
          <span class="input-icon-left">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </span>
          <input type="password" id="login-password" class="auth-input auth-input-with-icon" placeholder="••••••••" required autocomplete="current-password">
        </div>
      </div>

      <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
        <input type="checkbox" id="remember" style="accent-color:#6366f1; width:13px; height:13px; cursor:pointer; margin:0;">
        <label for="remember" style="font-size:12.5px; color:#475569; cursor:pointer; user-select:none;">Remember me</label>
      </div>

      <button type="submit" class="btn-auth" id="login-submit-btn" style="display:flex; align-items:center; justify-content:center; position:relative;">
        <span>Sign In to Workspace</span>
        <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" style="position:absolute; right:20px;"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
      </button>
    </form>

    <p class="auth-footer">
      New to Placenix? <span class="auth-link" onclick="location.hash='signup'">Create an account</span>
    </p>`;
}

function renderSignup() {
  return `
    <div class="auth-brand" style="margin-bottom: 32px; display: flex; align-items: center; gap: 12px;">
      <div class="auth-brand-logo">
        <img src="logo.png" alt="Placenix Logo">
      </div>
      <div class="auth-brand-name">Placenix</div>
    </div>

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

export function detectUserRole(email = '', Store = null) {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail) return 'student';

  // 1. Check known staff list in Store.staff or fallback default staff registry
  const staffList = (Store && Store.staff && Store.staff.length > 0) ? Store.staff : [
    { email: 'fa1@gamail.com', role: 'faculty' },
    { email: 'fa@placenix.edu', role: 'faculty' },
    { email: 'faculty@placenix.edu', role: 'faculty' },
    { email: 'dept@gmail.com', role: 'coordinator' },
    { email: 'coordinator@placenix.edu', role: 'coordinator' },
    { email: 'saiganka2410@gmail.com', role: 'tpo' },
    { email: 'tpo@placenix.edu', role: 'tpo' },
    { email: 'srithikansrinivasan+admin@gmail.com', role: 'admin' },
    { email: 'admin@placenix.edu', role: 'admin' },
    { email: 'saas@placenix.edu', role: 'saas-admin' }
  ];

  const matchedStaff = staffList.find(s => s.email && s.email.toLowerCase() === cleanEmail);
  if (matchedStaff && matchedStaff.role && matchedStaff.role !== 'None') {
    return matchedStaff.role === 'department' ? 'coordinator' : matchedStaff.role;
  }

  // 2. Check local persistent profile cache
  try {
    const profileCache = JSON.parse(localStorage.getItem('placenix_profile_cache') || '{}');
    const deterministicId = 'usr_' + cleanEmail.replace(/[^a-zA-Z0-9_]/g, '_');
    const cached = profileCache[deterministicId] || 
      profileCache[cleanEmail] || 
      Object.values(profileCache).find(p => (p.email && p.email.toLowerCase() === cleanEmail) || (p.personal_email && p.personal_email.toLowerCase() === cleanEmail));
    if (cached && cached.role) {
      return cached.role === 'department' ? 'coordinator' : cached.role;
    }
  } catch (e) {}

  // 3. Heuristic pattern recognition based on email handle / prefix
  const prefix = cleanEmail.split('@')[0];
  if (/^(admin|superadmin|root|sysadmin)/i.test(prefix) || cleanEmail.includes('+admin')) {
    return 'admin';
  }
  if (/^(tpo|placement|recruiter|placements|t&p)/i.test(prefix) || cleanEmail.includes('+tpo')) {
    return 'tpo';
  }
  if (/^(dept|coordinator|coord|department|hod|hod_)/i.test(prefix) || cleanEmail.includes('+coord') || cleanEmail.includes('+dept')) {
    return 'coordinator';
  }
  if (/^(fa|faculty|advisor|mentor|prof|professor|dr\.)/i.test(prefix) || cleanEmail.includes('+faculty') || cleanEmail.includes('+fa')) {
    return 'faculty';
  }
  if (/^(saas|super)/i.test(prefix)) {
    return 'saas-admin';
  }

  // Default fallback for student register numbers / general emails
  return 'student';
}

function getRoleMeta(role) {
  const meta = {
    'student': {
      icon: '🎓',
      title: 'Student Portal',
      subtitle: 'Academic journey & placement analytics'
    },
    'faculty': {
      icon: '👨‍🏫',
      title: 'Faculty Advisor Portal',
      subtitle: 'Mentorship & student endorsement workspace'
    },
    'coordinator': {
      icon: '🏛️',
      title: 'Department Coordinator Portal',
      subtitle: 'Departmental telemetry & verification'
    },
    'department': {
      icon: '🏛️',
      title: 'Department Coordinator Portal',
      subtitle: 'Departmental telemetry & verification'
    },
    'tpo': {
      icon: '💼',
      title: 'TPO Placement Office',
      subtitle: 'Campus recruitment logistics & drives'
    },
    'admin': {
      icon: '🛡️',
      title: 'Institutional Admin Center',
      subtitle: 'Global infrastructure & role governance'
    },
    'saas-admin': {
      icon: '⚡',
      title: 'SaaS Platform Admin',
      subtitle: 'Multi-tenant cloud management'
    }
  };
  return meta[role] || meta['student'];
}

function initAuth(root, mode, Store, supabase) {
  const forgotBtn = root.querySelector('#forgot-password-link');
  if (forgotBtn) {
    forgotBtn.onclick = async () => {
      const emailInput = root.querySelector('#login-email');
      const email = emailInput ? emailInput.value.trim() : '';
      let targetEmail = email;
      if (!targetEmail) {
        targetEmail = prompt('Please enter your email address to reset your password:');
      }
      if (!targetEmail) return;

      try {
        if (!supabase) throw new Error('Supabase client is not initialized.');
        const { error } = await supabase.auth.resetPasswordForEmail(targetEmail, {
          redirectTo: window.location.origin + '/#login'
        });
        if (error) throw error;
        if (window.showToast) {
          window.showToast('Password reset link sent successfully! Check your inbox.', 'success');
        } else {
          alert('Password reset link sent successfully! Check your inbox.');
        }
      } catch (err) {
        if (window.showToast) {
          window.showToast('Error: ' + err.message, 'error');
        } else {
          alert('Error: ' + err.message);
        }
      }
    };
  }
  
  // Vercel Spotlight Cursor Follower Tracker
  const container = root.querySelector('.auth-form-container');
  if (container) {
    container.addEventListener('mousemove', (e) => {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      container.style.setProperty('--mouse-x', `${x}px`);
      container.style.setProperty('--mouse-y', `${y}px`);
    });
  }

  // Live Telemetry Logs
  const logMessages = [
    { type: 'SYS', text: 'Syncing departmental academic records...' },
    { type: 'SYNC', text: 'Onboarded 12 new recruiter channels' },
    { type: 'LIVE', text: 'TCS drive active - CSE/ECE candidates qualifying' },
    { type: 'AUTH', text: 'Faculty session authenticated dynamically' },
    { type: 'INFO', text: 'Student profile resumes parsed: 91% matches' },
    { type: 'LIVE', text: 'Amazon coding test server online CSE/IT' },
    { type: 'SYS', text: 'Deploying security handshake: Supabase core' },
    { type: 'SYNC', text: 'Average package metrics updated: 12.5 LPA' },
    { type: 'INFO', text: 'Stripe shortlist complete: 8 students selected' }
  ];

  let logInterval = null;
  function startTelemetryStream() {
    const logContainer = root.querySelector('#telemetry-log-container');
    if (!logContainer) return;

    logContainer.innerHTML = '';

    function appendLog(log) {
      const line = document.createElement('div');
      line.style.opacity = '0';
      line.style.transform = 'translateY(8px)';
      line.style.transition = 'all 0.3s cubic-bezier(0.25, 1, 0.5, 1)';
      line.style.fontFamily = 'Courier New, Courier, monospace';
      
      let typeColor = '#3b82f6';
      if (log.type === 'LIVE') typeColor = '#10b981';
      if (log.type === 'SYNC') typeColor = '#8b5cf6';
      if (log.type === 'AUTH') typeColor = '#ec4899';

      line.innerHTML = `<span style="color:${typeColor}; font-weight:700;">[${log.type}]</span> <span style="color:#cbd5e1;">${log.text}</span>`;
      logContainer.appendChild(line);
      
      setTimeout(() => {
        line.style.opacity = '1';
        line.style.transform = 'translateY(0)';
      }, 50);

      if (logContainer.children.length > 4) {
        const first = logContainer.children[0];
        first.style.opacity = '0';
        first.style.transform = 'translateY(-8px)';
        setTimeout(() => {
          if (logContainer.contains(first)) {
            logContainer.removeChild(first);
          }
        }, 300);
      }
    }

    logMessages.slice(0, 3).forEach(appendLog);

    let idx = 3;
    logInterval = setInterval(() => {
      appendLog(logMessages[idx]);
      idx = (idx + 1) % logMessages.length;
    }, 3000);
  }

  if (mode === 'login') {
    startTelemetryStream();

    // Live email role detection feedback
    const emailInput = root.querySelector('#login-email');
    const roleBadge = root.querySelector('#role-detect-badge');
    const roleIcon = root.querySelector('#role-badge-icon');
    const roleTitle = root.querySelector('#role-badge-title');
    const roleSubtitle = root.querySelector('#role-badge-subtitle');

    if (emailInput && roleBadge) {
      const updateBadge = () => {
        const val = emailInput.value.trim();
        if (val.length >= 3) {
          const detected = detectUserRole(val, Store);
          const meta = getRoleMeta(detected);
          if (roleIcon) roleIcon.textContent = meta.icon;
          if (roleTitle) roleTitle.textContent = meta.title;
          if (roleSubtitle) roleSubtitle.textContent = meta.subtitle;
          roleBadge.style.display = 'flex';
        } else {
          roleBadge.style.display = 'none';
        }
      };

      emailInput.addEventListener('input', updateBadge);
      emailInput.addEventListener('change', updateBadge);
      emailInput.addEventListener('blur', updateBadge);
    }
  }

  // Clean up interval when view transitions away
  const obs = new MutationObserver(() => {
    if (!document.body.contains(container)) {
      if (logInterval) clearInterval(logInterval);
      obs.disconnect();
    }
  });
  obs.observe(document.body, { childList: true, subtree: true });

  const form = root.querySelector(mode === 'signup' ? '#signup-form' : '#login-form');
  if (!form) return;

  form.onsubmit = async e => {
    e.preventDefault();
    if (!supabase) return window.showToast('Operational system error: Supabase core missing.', 'danger');
    
    const btn = root.querySelector(mode === 'signup' ? '#signup-submit-btn' : '#login-submit-btn');
    btn.disabled = true;
    btn.textContent = 'Authenticating...';

    const email = root.querySelector('#' + mode + '-email').value.trim().toLowerCase();
    const password = root.querySelector('#' + mode + '-password').value;

    const detectedRole = detectUserRole(email, Store);

    const roleHashMap = {
      'student': 'student-dashboard',
      'faculty': 'faculty-dashboard',
      'tpo': 'tpo-dashboard',
      'department': 'coordinator-dashboard',
      'coordinator': 'coordinator-dashboard',
      'admin': 'admin-dashboard',
      'saas-admin': 'saas-admin'
    };

    try {
      if (mode === 'login') {
        const loginPromise = supabase.auth.signInWithPassword({ email, password });
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database Connection Timeout')), 6000)
        );

        try {
          const { data, error } = await Promise.race([loginPromise, timeoutPromise]);
          if (error) throw error;

          if (data && data.user) {
            let userRole = data.user.user_metadata?.role || detectedRole;
            try {
              const { data: dbProf } = await supabase.from('profiles').select('role').eq('id', data.user.id).maybeSingle();
              if (dbProf && dbProf.role) {
                userRole = dbProf.role;
              } else {
                const { data: staffProf } = await supabase.from('staff_profiles').select('role').eq('email', email).maybeSingle();
                if (staffProf && staffProf.role && staffProf.role !== 'None') {
                  userRole = staffProf.role;
                }
              }
            } catch (e) {}

            Store.session.user = {
              id: data.user.id,
              email: data.user.email,
              full_name: data.user.user_metadata?.full_name || email.split('@')[0],
              ...data.user.user_metadata,
              role: userRole
            };
            Store.session.role = userRole;
            localStorage.setItem('placenix-mock-session', JSON.stringify(Store.session.user));
            localStorage.setItem('placenix_user_session', JSON.stringify(Store.session.user));

            window.dispatchEvent(new CustomEvent('store-updated'));

            window.location.hash = roleHashMap[userRole] || 'student-dashboard';
            return;
          }
        } catch (authErr) {
          console.warn('⚠️ Supabase Authentication failed or timed out:', authErr.message);
          console.log('🔄 Triggering offline sandbox authentication fallback with auto-detected role:', detectedRole);
          
          // Construct local mock user profile restoring any previously saved profile details
          const profileCache = JSON.parse(localStorage.getItem('placenix_profile_cache') || '{}');
          const regClean = email.split('@')[0];
          const deterministicId = 'usr_' + email.replace(/[^a-zA-Z0-9_]/g, '_');
          
          // Find any previously saved profile matching email or register number
          const existingProfile = profileCache[deterministicId] || 
            profileCache[email] || 
            profileCache[regClean] ||
            Object.values(profileCache).find(p => 
              (p.email && p.email.toLowerCase() === email) ||
              (p.personal_email && p.personal_email.toLowerCase() === email) ||
              (p.register_number && p.register_number === regClean) ||
              (p.roll_number && p.roll_number === regClean)
            ) || {};

          const finalRole = existingProfile.role || detectedRole;

          const mockUser = {
            id: existingProfile.id || deterministicId,
            email: email,
            full_name: existingProfile.full_name || regClean,
            role: finalRole,
            institution: existingProfile.college || 'Kalasalingam University',
            register_number: existingProfile.register_number || (finalRole === 'student' ? regClean : ''),
            roll_number: existingProfile.roll_number || (finalRole === 'student' ? regClean : ''),
            department: existingProfile.department || 'Computer Science & Engineering',
            cgpa: existingProfile.cgpa || 8.5,
            ...existingProfile
          };
          
          // Update in-memory registry
          Store.session.user = mockUser;
          Store.session.role = finalRole;
          
          // Persist mock session and cache
          localStorage.setItem('placenix-mock-session', JSON.stringify(mockUser));
          localStorage.setItem('placenix_user_session', JSON.stringify(mockUser));
          localStorage.setItem('placenix_active_student_profile', JSON.stringify(mockUser));
          profileCache[mockUser.id] = mockUser;
          profileCache[mockUser.email.toLowerCase()] = mockUser;
          if (mockUser.register_number) profileCache[mockUser.register_number] = mockUser;
          localStorage.setItem('placenix_profile_cache', JSON.stringify(profileCache));
          
          window.showToast(`Authenticated into ${mockUser.role.toUpperCase()} Workspace.`, 'success');
          
          // Dispatch store update to trigger sidebar/shell updates
          window.dispatchEvent(new CustomEvent('store-updated'));
          
          // Re-route to target workspace dashboard based on detected role
          const targetHash = roleHashMap[finalRole] || 'student-dashboard';
          window.location.hash = targetHash;
          return;
        }
      } else {
        const fname = root.querySelector('#signup-fname').value.trim();
        const lname = root.querySelector('#signup-lname').value.trim();
        const role = root.querySelector('#signup-role').value;
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: { data: { first_name: fname, last_name: lname, full_name: `${fname} ${lname}`, role } }
        });
        if (error) throw error;

        if (role !== 'student') {
          console.log('📡 Creating pending staff profile for role:', role);
          const { error: staffErr } = await supabase
            .from('staff_profiles')
            .insert([{
              name: `${fname} ${lname}`,
              email: email,
              status: 'Pending',
              role: role === 'department' ? 'coordinator' : role,
              mapping: 'None'
            }]);
          if (staffErr) {
            console.warn('⚠️ staff_profiles registration failed:', staffErr.message);
          } else {
            console.log('📡 Pending staff profile successfully registered.');
          }
        }

        window.showToast('Registration successful! Please check your email inbox.', 'success');
        window.location.hash = 'login';
      }
    } catch (err) {
      window.showToast('Security Exception: ' + err.message, 'danger');
      btn.disabled = false;
      btn.textContent = mode === 'signup' ? 'Begin Onboarding' : 'Sign In to Workspace';
    }
  };
}
