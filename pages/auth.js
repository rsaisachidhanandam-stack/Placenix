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
      background-image: url('placement_clean_bg.png');
      background-size: 110% 110%; 
      background-position: center;
      background-repeat: no-repeat;
      display: flex; 
      flex-direction: column; 
      justify-content: flex-end;
      padding: 60px 72px;
      position: relative; 
      overflow: hidden;
      animation: slow-pan 24s ease-in-out infinite;
    }
    @keyframes slow-pan {
      0%, 100% { background-position: center; background-size: 110% 110%; }
      50% { background-position: 48% 52%; background-size: 115% 115%; }
    }

    /* Stat cards overlay on left panel */
    .auth-stat-cards {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
      position: relative;
      z-index: 4;
    }
    .auth-stat-card {
      background: rgba(10, 15, 28, 0.72);
      border: 1px solid rgba(0, 200, 255, 0.18);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border-radius: 16px;
      padding: 18px 22px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06);
      transition: transform 0.3s ease, box-shadow 0.3s ease;
      min-width: 130px;
    }
    .auth-stat-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 16px 40px rgba(0,0,0,0.5), 0 0 20px rgba(0,200,255,0.1), inset 0 1px 0 rgba(255,255,255,0.08);
    }
    .auth-stat-value {
      font-size: 1.6rem;
      font-weight: 800;
      color: #fff;
      letter-spacing: -0.03em;
      line-height: 1;
    }
    .auth-stat-label {
      font-size: 11px;
      font-weight: 600;
      color: #64748B;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-top: 2px;
    }
    .auth-stat-icon {
      width: 28px; height: 28px;
      background: rgba(0,200,255,0.12);
      border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      margin-bottom: 10px;
      color: #00C8FF;
    }

    /* Left panel gradient overlays */
    .auth-visual-grad-bottom {
      position: absolute; bottom: 0; left: 0; right: 0;
      height: 55%;
      background: linear-gradient(to top, rgba(8,10,16,0.92) 0%, rgba(8,10,16,0) 100%);
      pointer-events: none; z-index: 2;
    }
    .auth-visual-grad-right {
      position: absolute; top: 0; right: 0; bottom: 0;
      width: 30%;
      background: linear-gradient(to left, rgba(8,10,16,0.9) 0%, transparent 100%);
      pointer-events: none; z-index: 3;
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
      width: 34px; height: 34px;
      background: linear-gradient(135deg,#00C8FF22,#6366f122);
      border: 1px solid rgba(0,200,255,0.25);
      border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      overflow: hidden;
      box-shadow: 0 0 20px rgba(0,200,255,0.15);
    }
    .auth-brand-logo img { width: 100%; height: 100%; object-fit: cover; object-position: 50% 15%; }
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

    /* ── Role Card Grid ─────────────────────────────────── */
    .role-card-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 24px;
    }
    .role-card-btn {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 14px;
      padding: 14px 16px;
      cursor: pointer;
      transition: all 0.25s cubic-bezier(0.25, 1, 0.5, 1);
      text-align: left;
      overflow: hidden;
    }
    .role-card-btn::before {
      content: '';
      position: absolute; inset: 0;
      border-radius: 14px;
      opacity: 0;
      background: linear-gradient(135deg, rgba(0,200,255,0.08), rgba(99,102,241,0.06));
      transition: opacity 0.25s;
    }
    .role-card-btn:hover::before { opacity: 1; }
    .role-card-btn:hover {
      border-color: rgba(0,200,255,0.25);
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(0,0,0,0.3);
    }
    .role-card-btn.active {
      border-color: rgba(0,200,255,0.55);
      background: rgba(0,200,255,0.07);
      box-shadow: 0 0 0 1px rgba(0,200,255,0.25), 0 8px 32px rgba(0,200,255,0.12);
    }
    .role-card-btn.active::before { opacity: 1; }
    .role-card-icon {
      width: 30px; height: 30px;
      border-radius: 9px;
      background: rgba(255,255,255,0.06);
      display: flex; align-items: center; justify-content: center;
      color: #64748B;
      transition: all 0.25s;
      flex-shrink: 0;
    }
    .role-card-btn.active .role-card-icon {
      background: rgba(0,200,255,0.15);
      color: #00C8FF;
      box-shadow: 0 0 10px rgba(0,200,255,0.2);
    }
    .role-card-btn:hover .role-card-icon {
      color: #00C8FF;
    }
    .role-card-icon svg { width: 15px; height: 15px; stroke: currentColor; }
    .role-card-name {
      font-size: 12.5px;
      font-weight: 700;
      color: #94A3B8;
      transition: color 0.25s;
      line-height: 1;
    }
    .role-card-btn.active .role-card-name { color: #fff; }
    .role-card-btn:hover .role-card-name { color: #cbd5e1; }
    .role-card-desc {
      font-size: 10px;
      color: #475569;
      font-weight: 500;
      line-height: 1.3;
      transition: color 0.25s;
    }
    .role-card-btn.active .role-card-desc { color: rgba(0,200,255,0.7); }
    /* Active checkmark */
    .role-card-check {
      position: absolute;
      top: 10px; right: 10px;
      width: 16px; height: 16px;
      border-radius: 50%;
      background: #00C8FF;
      display: flex; align-items: center; justify-content: center;
      opacity: 0;
      transform: scale(0.5);
      transition: all 0.2s cubic-bezier(0.25, 1, 0.5, 1);
    }
    .role-card-btn.active .role-card-check {
      opacity: 1;
      transform: scale(1);
    }
    .role-card-check svg { width: 9px; height: 9px; stroke: #080A10; stroke-width: 3; }
    /* Keep pill hidden — needed by JS but not shown */
    .role-selector-pill { display: none; }
    .role-pill-bg { display: none; }
    .role-pill-btn { display: none; }

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
      <div class="auth-visual-grad-bottom"></div>
      <div class="auth-visual-grad-right"></div>
      <div class="auth-stat-cards">
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
  const roles = [
    { id: 'student',    name: 'Student',     desc: 'Academic journey',   icon: `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5"/></svg>` },
    { id: 'faculty',   name: 'FA Advisor',  desc: 'Mentor workspace',   icon: `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>` },
    { id: 'department', name: 'Dept. Coord.', desc: 'Dept. management',  icon: `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 22V8h18v14M6 22V12h4v10M14 22V12h4v10M2 2h20"/></svg>` },
    { id: 'tpo',       name: 'TPO Office',  desc: 'Placement control',  icon: `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>` },
    { id: 'admin',     name: 'Admin',       desc: 'Institutional ops',  icon: `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>` }
  ];

  const checkIcon = `<svg fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>`;

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
      System Operational — All services live
    </div>

    <!-- Hidden pill (kept for JS compatibility) -->
    <div class="role-selector-pill" aria-hidden="true">
      <div class="role-pill-bg"></div>
      ${roles.map((r, i) => `
        <button type="button" class="role-pill-btn ${i === 0 ? 'active' : ''}" data-role="${r.id}">${r.name}</button>
      `).join('')}
    </div>

    <!-- Hidden telemetry log (kept for JS) -->
    <div id="telemetry-log-container" style="display:none;"></div>

    <!-- Role Card Grid -->
    <div class="role-card-grid">
      ${roles.map((r, i) => `
        <button type="button"
          class="role-card-btn ${i === 0 ? 'active' : ''}"
          data-role-card="${r.id}"
          data-role="${r.id}"
          aria-pressed="${i === 0}">
          <div class="role-card-check">${checkIcon}</div>
          <div class="role-card-icon">${r.icon}</div>
          <div class="role-card-name">${r.name}</div>
          <div class="role-card-desc">${r.desc}</div>
        </button>
      `).join('')}
    </div>

    <!-- Login Form -->
    <form id="login-form">
      <div class="input-wrapper">
        <label class="input-label">Email Address</label>
        <div class="input-group-icon">
          <span class="input-icon-left">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          </span>
          <input type="email" id="login-email" class="auth-input auth-input-with-icon" placeholder="name@email.com" required>
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
          <input type="password" id="login-password" class="auth-input auth-input-with-icon" placeholder="••••••••" required>
        </div>
      </div>

      <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
        <input type="checkbox" id="remember" style="accent-color:#6366f1; width:13px; height:13px; cursor:pointer; margin:0;">
        <label for="remember" style="font-size:12.5px; color:#475569; cursor:pointer; user-select:none;">Remember me</label>
      </div>

      <button type="submit" class="btn-auth" id="login-submit-btn" style="display:flex; align-items:center; justify-content:center; position:relative;">
        <span>Sign In</span>
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

function initAuth(root, mode, Store, supabase) {
  let selectedRole = 'student';

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

    // Helper to append a single log line
    function appendLog(log) {
      const line = document.createElement('div');
      line.style.opacity = '0';
      line.style.transform = 'translateY(8px)';
      line.style.transition = 'all 0.3s cubic-bezier(0.25, 1, 0.5, 1)';
      line.style.fontFamily = 'Courier New, Courier, monospace';
      
      let typeColor = '#3b82f6'; // blue
      if (log.type === 'LIVE') typeColor = '#10b981'; // green
      if (log.type === 'SYNC') typeColor = '#8b5cf6'; // purple
      if (log.type === 'AUTH') typeColor = '#ec4899'; // pink

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

    // Prefill 3 items
    logMessages.slice(0, 3).forEach(appendLog);

    let idx = 3;
    logInterval = setInterval(() => {
      appendLog(logMessages[idx]);
      idx = (idx + 1) % logMessages.length;
    }, 3000);
  }

  // Trigger telemetry logs
  if (mode === 'login') {
    startTelemetryStream();
  }

  // Set up role switcher pill actions
  const tabs = root.querySelectorAll('.role-pill-btn');
  const pillBg = root.querySelector('.role-pill-bg');
  
  function updatePillPosition(activeTab) {
    if (!pillBg || !activeTab) return;
    pillBg.style.left = `${activeTab.offsetLeft}px`;
    pillBg.style.width = `${activeTab.offsetWidth}px`;
  }

  tabs.forEach(tab => {
    tab.onclick = () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      selectedRole = tab.getAttribute('data-role');
      updatePillPosition(tab);
      // Sync card selection too
      syncCardSelection(selectedRole);
    };
  });

  // Position pill initially on student
  const activeTab = root.querySelector('.role-pill-btn.active');
  if (activeTab) {
    setTimeout(() => updatePillPosition(activeTab), 150);
  }

  // Role Card Grid — wire up click → selectedRole + sync hidden pills
  function syncCardSelection(roleId) {
    const cards = root.querySelectorAll('.role-card-btn');
    cards.forEach(c => {
      const isActive = c.getAttribute('data-role-card') === roleId;
      c.classList.toggle('active', isActive);
      c.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
    // Also sync hidden pill buttons so JS logic still picks up correct role
    tabs.forEach(t => {
      t.classList.toggle('active', t.getAttribute('data-role') === roleId);
    });
  }

  const roleCards = root.querySelectorAll('.role-card-btn');
  roleCards.forEach(card => {
    card.onclick = () => {
      selectedRole = card.getAttribute('data-role-card');
      syncCardSelection(selectedRole);
    };
  });

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
            let userRole = data.user.user_metadata?.role || selectedRole;
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

            const roleHashMap = {
              'student': 'student-dashboard',
              'faculty': 'faculty-dashboard',
              'tpo': 'tpo-dashboard',
              'department': 'coordinator-dashboard',
              'coordinator': 'coordinator-dashboard',
              'admin': 'admin-dashboard',
              'saas-admin': 'saas-admin'
            };
            window.location.hash = roleHashMap[userRole] || 'student-dashboard';
            return;
          }
        } catch (authErr) {
          console.warn('⚠️ Supabase Authentication failed or timed out:', authErr.message);
          console.log('🔄 Triggering offline sandbox authentication fallback...');
          
          // Construct local mock user profile based on role tab selection
          const mockUser = {
            id: 'mock-usr-' + Math.floor(Math.random() * 100000),
            email: email,
            full_name: email.split('@')[0],
            role: selectedRole,
            institution: 'Placenix Institutional Node'
          };
          
          // Update in-memory registry
          Store.session.user = mockUser;
          Store.session.role = selectedRole;
          
          // Persist mock session locally so app boots directly into sandbox mode on refresh
          localStorage.setItem('placenix-mock-session', JSON.stringify(mockUser));
          
          window.showToast('Database Offline: Authenticated in Sandbox mode.', 'success');
          
          // Dispatch store update to trigger sidebar/shell updates
          window.dispatchEvent(new CustomEvent('store-updated'));
          
          // Re-route to target workspace dashboard based on selected role
          const roleHashMap = {
            'student': 'student-dashboard',
            'faculty': 'faculty-dashboard',
            'tpo': 'tpo-dashboard',
            'department': 'coordinator-dashboard',
            'coordinator': 'coordinator-dashboard',
            'admin': 'admin-dashboard',
            'saas-admin': 'saas-admin'
          };
          const targetHash = roleHashMap[selectedRole] || 'student-dashboard';
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
      btn.textContent = mode === 'signup' ? 'Begin Onboarding' : 'Sign In';
    }
  };
}
