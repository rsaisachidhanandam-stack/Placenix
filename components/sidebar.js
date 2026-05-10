// ============================================================
// PLACENIX — SIDEBAR & TOPBAR COMPONENTS
// ============================================================

import { supabase } from '../supabase.js';

const NAV_ITEMS = {
  student: [
    { section: 'Overview' },
    { route: 'student-dashboard', icon: 'layout-dashboard', label: 'Dashboard', badge: null },
    { route: 'profile',           icon: 'user',             label: 'My Profile', badge: null },
    { route: 'resume',            icon: 'file-text',        label: 'Resume Intelligence', badge: null },
    { route: 'employability',     icon: 'bar-chart-2',      label: 'Employability Score', badge: null },
    { section: 'Placements' },
    { route: 'drives',            icon: 'briefcase',        label: 'Placement Drives', badge: '3', badgeType: 'success' },
    { route: 'interview-repo',    icon: 'message-square',   label: 'Interview Repo', badge: null },
    { section: 'Network' },
    { route: 'alumni',            icon: 'users',            label: 'Alumni Connect', badge: null },
    { route: 'ai-modules',        icon: 'cpu',              label: 'AI Modules', badge: 'New', badgeType: 'violet' },
    { section: 'Support' },
    { route: 'communication',     icon: 'bell',             label: 'Notifications', badge: '5', badgeType: 'danger' },
  ],
  tpo: [
    { section: 'Operations' },
    { route: 'tpo-dashboard',     icon: 'layout-dashboard', label: 'Dashboard', badge: null },
    { route: 'drives',            icon: 'briefcase',        label: 'Placement Drives', badge: null },
    { route: 'kanban',            icon: 'trello',           label: 'Recruitment Pipeline', badge: null },
    { section: 'Intelligence' },
    { route: 'analytics',         icon: 'trending-up',      label: 'Analytics', badge: null },
    { route: 'employability',     icon: 'bar-chart-2',      label: 'Student Readiness', badge: null },
    { section: 'Network' },
    { route: 'alumni',            icon: 'users',            label: 'Alumni', badge: null },
    { route: 'communication',     icon: 'bell',             label: 'Communication', badge: '3', badgeType: 'danger' },
    { route: 'ai-modules',        icon: 'cpu',              label: 'AI Modules', badge: null },
  ],
  university_admin: [
    { section: 'Overview' },
    { route: 'admin-dashboard',   icon: 'layout-dashboard', label: 'Dashboard', badge: null },
    { route: 'analytics',         icon: 'trending-up',      label: 'Analytics', badge: null },
    { section: 'Management' },
    { route: 'drives',            icon: 'briefcase',        label: 'Drives', badge: null },
    { route: 'kanban',            icon: 'trello',           label: 'Pipeline', badge: null },
    { route: 'saas-admin',        icon: 'settings',         label: 'Institution Admin', badge: null },
    { section: 'Network' },
    { route: 'alumni',            icon: 'users',            label: 'Alumni', badge: null },
    { route: 'communication',     icon: 'bell',             label: 'Communication', badge: null },
  ],
};

const ICONS = {
  'layout-dashboard': `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,
  'file-text':        `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>`,
  'bar-chart-2':      `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
  'briefcase':        `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/><line x1="12" y1="12" x2="12" y2="12"/></svg>`,
  'message-square':   `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>`,
  'users':            `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>`,
  'cpu':              `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>`,
  'bell':             `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/></svg>`,
  'trending-up':      `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`,
  'trello':           `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><rect x="7" y="7" width="3" height="9"/><rect x="14" y="7" width="3" height="5"/></svg>`,
  'settings':         `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>`,
  'user':             `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  'chevron-left':     `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>`,
  'menu':             `<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`,
  'search':           `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  'sun':              `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`,
  'moon':             `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>`,
  'log-out':          `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
};

function getIcon(name) {
  return ICONS[name] || `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>`;
}

export function renderSidebar(role, activeRoute, user) {
  const items = NAV_ITEMS[role] || NAV_ITEMS.student;

  const navHTML = items.map(item => {
    if (item.section) {
      return `<div class="sidebar-section-label">${item.section}</div>`;
    }
    const isActive = item.route === activeRoute;
    const badge = item.badge
      ? `<span class="nav-badge ${item.badgeType || ''}">${item.badge}</span>`
      : '';
    return `
      <a class="nav-item ${isActive ? 'active' : ''}" data-route="${item.route}" href="#${item.route}">
        <span class="nav-icon">${getIcon(item.icon)}</span>
        <span class="nav-label">${item.label}</span>
        ${badge}
      </a>`;
  }).join('');

  const initials = (user?.full_name || 'User').split(' ').map(n=>n[0]).join('').toUpperCase();
  const collegeName = user?.college || 'Institution';
  const shortCollege = collegeName.split(' ')[0];

  return `
    <a class="sidebar-logo" href="#" data-route="landing">
      <div class="sidebar-logo-icon">🎓</div>
      <span class="sidebar-logo-text">Placenix</span>
    </a>
    <nav class="sidebar-nav">${navHTML}</nav>
    <div class="sidebar-profile">
      <div class="sidebar-avatar">${initials}</div>
      <div class="sidebar-profile-info">
        <div class="sidebar-profile-name">${user?.full_name || 'User'}</div>
        <div class="sidebar-profile-role">${user?.role || 'Member'} · ${shortCollege}</div>
      </div>
      <button class="btn-icon" id="logout-btn" title="Sign Out" style="margin-left:auto;color:var(--danger);">
        ${getIcon('log-out')}
      </button>
    </div>
  `;
}

export function renderTopbar(user, activeRoute) {
  const pageTitles = {
    'student-dashboard': 'Dashboard',
    'tpo-dashboard': 'TPO Dashboard',
    'admin-dashboard': 'Admin Dashboard',
    'resume': 'Resume Intelligence',
    'employability': 'Employability Engine',
    'drives': 'Placement Drives',
    'kanban': 'Recruitment Pipeline',
    'analytics': 'Analytics & Reports',
    'alumni': 'Alumni Ecosystem',
    'interview-repo': 'Interview Repository',
    'communication': 'Communications',
    'ai-modules': 'AI Modules',
    'saas-admin': 'SaaS Administration',
  };

  const title = pageTitles[activeRoute] || 'Dashboard';
  const initials = (user?.full_name || 'U').split(' ').map(n=>n[0]).join('').toUpperCase();

  return `
    <header class="topbar">
      <div class="topbar-left">
        <button class="btn-icon" id="mobile-menu-btn" style="display:none;">
          ${getIcon('menu')}
        </button>
        <button class="btn-icon" id="sidebar-collapse-btn" data-tooltip="Collapse sidebar">
          ${getIcon('chevron-left')}
        </button>
        <div class="topbar-breadcrumb">
          <span>Placenix</span>
          <span style="color:var(--border-medium)">›</span>
          <span class="current">${title}</span>
        </div>
      </div>
      <div class="topbar-right">
        <div class="search-bar" style="min-width:200px;">
          <span class="search-icon">${getIcon('search')}</span>
          <input type="text" placeholder="Search…">
        </div>
        <button class="btn-icon" id="theme-toggle-btn" data-tooltip="Toggle theme">
          ${getIcon('sun')}
        </button>
        <div class="notif-bell" data-tooltip="Notifications">
          ${getIcon('bell')}
          <span class="notif-dot"></span>
        </div>
        <div class="sidebar-avatar" style="cursor:pointer;" title="${user?.full_name || 'User'}">
          ${initials}
        </div>
      </div>
    </header>
  `;
}
