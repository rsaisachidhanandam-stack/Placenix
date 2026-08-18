// ============================================================
// PLACENIX — CENTRALIZED SPA ROUTER (FULLY HARMONIZED)
// ============================================================

import { loadLandingPage }   from './pages/landing.js';
import { loadAuthPage }      from './pages/auth.js';
import { loadOnboardingPage } from './pages/onboarding.js';
import { loadStudentDash }   from './pages/dashboard-student.js';
import { loadTPODash, loadAdminDash } from './pages/dashboard-tpo.js';
import { loadProfilePage }   from './pages/profile.js';
import { loadDrivesPage }    from './pages/drives.js';
import { loadAlumniPage }    from './pages/alumni.js';
import { loadAnalyticsPage } from './pages/analytics.js';
import { loadAIPage }        from './pages/ai-modules.js';
import { loadRepoPage }      from './pages/interview-repo.js';
import { loadCommPage }      from './pages/communication.js';
import { loadVirtualInterviewPage } from './pages/virtual-interview.js';
import { loadResumePage }    from './pages/resume-intelligence.js';
import { loadEmployabilityPage } from './pages/employability.js';
import { 
  loadDeptDash, loadDeptStudents, loadDeptResume, 
  loadDeptSkills, loadDeptNewJobs, loadDeptPrevJobs, 
  loadDeptAnnouncements, loadDeptQueries 
} from './pages/dashboard-dept.js';
import { loadFacultyAdvisorPage } from './pages/faculty-advisor.js';
import { loadAdminControl } from './pages/admin-control.js';
import { loadKanbanPage } from './pages/kanban.js';
import { loadSlotAllocationPage } from './pages/slot-allocation.js';
import { loadMySlotsPage } from './pages/my-slots.js';
import { loadAttendanceTrackerPage } from './pages/attendance-tracker.js';
import { loadSaaSPage } from './pages/saas-admin.js';
import { renderSkeleton } from './components/skeleton.js';

import { renderSidebar, renderTopbar } from './components/sidebar.js';
import { supabase   } from './supabase.js';
import Store          from './store.js';

const DASHBOARD_PAGES = [
  'student-dashboard', 'tpo-dashboard', 'coordinator-dashboard', 'department-dashboard', 'admin-dashboard', 'faculty-dashboard',
  'student-details', 'profile', 'employability', 'skill-analysis', 
  'drives', 'new-applications', 'my-applications', 'completed-batches',
  'alumni', 'alumni-connect', 'analytics', 'ai-modules', 'ai-predictor',
  'interview-repo', 'communication', 'queries', 'virtual-interview', 
  'faculty-advisor', 'faculty-dashboard', 'fa-students', 'fa-resume', 'fa-skills', 'fa-new-jobs', 'fa-prev-jobs',
  'admin-dept', 'resume', 'resume-analysis', 'kanban', 'saas-admin',
  'dept-students', 'dept-resume', 'dept-skills', 'dept-new-jobs', 'dept-prev-jobs', 'dept-announcements', 'dept-queries',
  'admin-setup', 'admin-staff', 'admin-roles', 'admin-mapping', 'slot-allocation', 'my-slots', 'attendance-tracker'
];

const routes = {
  '':                  loadLandingPage,
  'login':             (r,s,sb) => loadAuthPage(r,s,'login',sb),
  'signup':            (r,s,sb) => loadAuthPage(r,s,'signup',sb),
  'onboarding':        loadOnboardingPage,
  'student-dashboard': loadStudentDash,
  'my-slots':          loadMySlotsPage,
  'tpo-dashboard':     loadTPODash,
  'coordinator-dashboard': loadDeptDash,
  'department-dashboard':  loadDeptDash,
  'admin-dashboard':   loadAdminControl,
  'admin-setup':       loadAdminControl,
  'admin-staff':       loadAdminControl,
  'admin-roles':       loadAdminControl,
  'admin-mapping':     loadAdminControl,
  'student-details':   loadProfilePage,
  'profile':           loadProfilePage,
  'employability':     loadEmployabilityPage,
  'skill-analysis':    loadEmployabilityPage,
  'drives':            loadDrivesPage,
  'new-applications':  loadDrivesPage,
  'my-applications':   loadDrivesPage,
  'completed-batches': loadDrivesPage,
  'alumni':            loadAlumniPage,
  'alumni-connect':    loadAlumniPage,
  'analytics':         loadAnalyticsPage,
  'ai-modules':        loadAIPage,
  'ai-predictor':      loadAIPage,
  'interview-repo':    loadRepoPage,
  'communication':     loadCommPage,
  'queries':           loadCommPage,
  'virtual-interview': loadVirtualInterviewPage,
  'resume':            loadResumePage,
  'resume-analysis':   loadResumePage,
  'kanban':            loadKanbanPage,
  'attendance-tracker': loadAttendanceTrackerPage,
  'slot-allocation':   loadSlotAllocationPage,
  'saas-admin':        loadSaaSPage,
  'dept-students':      loadDeptStudents,
  'dept-resume':        loadDeptResume,
  'dept-skills':        loadDeptSkills,
  'dept-new-jobs':      loadDeptNewJobs,
  'dept-prev-jobs':      loadDeptPrevJobs,
  'dept-announcements': loadDeptAnnouncements,
  'dept-queries':       loadDeptQueries,
  'faculty-dashboard':  loadFacultyAdvisorPage,
  'fa-students':        loadFacultyAdvisorPage,
  'fa-resume':          loadFacultyAdvisorPage,
  'fa-skills':          loadFacultyAdvisorPage,
  'fa-new-jobs':        loadDeptNewJobs,
  'fa-prev-jobs':       loadDeptPrevJobs
};

function getRoute() {
  const hash = window.location.hash || '#';
  let raw = hash.replace(/^#+/, '') || '';
  if (raw.startsWith('/')) raw = raw.substring(1);
  const routePart = raw.split('?')[0];
  return routePart.replace(/_/g, '-').toLowerCase(); 
}

async function handleRoute() {
  const overlay = document.getElementById('placenix-error-overlay');
  if (overlay) overlay.style.display = 'none';

  const route = getRoute();

  // Navigation Guard: Prevent leaving active virtual interview
  if (window.previousRoute === 'virtual-interview' && route !== 'virtual-interview') {
    if (window.virtualInterviewInProgress) {
      const confirmed = confirm("Are you sure you want to exit the mock interview? Your current round's progress will be lost.");
      if (!confirmed) {
        // Revert the hash
        window.removeEventListener('hashchange', handleRoute);
        window.location.hash = '#virtual-interview';
        setTimeout(() => {
          window.addEventListener('hashchange', handleRoute);
        }, 50);
        
        // Revert active sidebar state
        const sidebarEl = document.getElementById('sidebar');
        if (sidebarEl) {
          const role = Store.session?.role || 'guest';
          const user = Store.session?.user;
          sidebarEl.innerHTML = renderSidebar(role, 'virtual-interview', user);
          initSidebar();
        }
        return;
      } else {
        // Confirmed leaving
        window.virtualInterviewInProgress = false;
        if (typeof window.cleanupVirtualInterview === 'function') {
          window.cleanupVirtualInterview();
        }
      }
    }
  }

  console.log('🧭 Router: Transitioning to node ->', route);
  console.table(Object.keys(routes));
  const app   = document.getElementById('app');
  if (!app) return;

  try {
    const isDash = DASHBOARD_PAGES.includes(route);
    const user   = Store.session?.user;
    const role   = Store.session?.role || 'guest';

    // 1. Guard: Opening root URL ('') redirects directly to '#login'
    if (route === '') {
      window.location.hash = 'login';
      return;
    }

    // 2. Guard: If not logged in, block accessing dashboard pages (redirect to login)
    if (!user && isDash) {
      console.log(`🛡️ Router Guard: Guest blocked from dashboard page [${route}]. Redirecting to login.`);
      window.location.hash = 'login';
      return;
    }

    // Role-Based Access Control (RBAC) Whitelist-based Guards
    if (user && isDash) {
      const allowedRoutes = {
        'student': [
          'student-dashboard', 'student-details', 'profile', 'resume-analysis', 'resume', 
          'employability', 'skill-analysis', 'ai-modules', 'ai-predictor',
          'new-applications', 'my-applications', 'my-slots', 'alumni-connect', 'alumni',
          'communication', 'queries', 'virtual-interview', 'interview-repo'
        ],
        'tpo': [
          'tpo-dashboard', 'drives', 'kanban', 'attendance-tracker', 'slot-allocation',
          'alumni-connect', 'alumni', 'profile', 'student-details', 'analytics', 'completed-batches',
          'new-applications', 'interview-repo', 'virtual-interview'
        ],
        'coordinator': [
          'coordinator-dashboard', 'department-dashboard', 'dept-students', 'dept-resume',
          'dept-skills', 'dept-new-jobs', 'dept-prev-jobs', 'attendance-tracker', 'slot-allocation', 'my-slots',
          'dept-announcements', 'dept-queries', 'alumni-connect', 'alumni', 'profile', 'student-details', 'analytics', 'virtual-interview'
        ],
        'department': [
          'coordinator-dashboard', 'department-dashboard', 'dept-students', 'dept-resume',
          'dept-skills', 'dept-new-jobs', 'dept-prev-jobs', 'attendance-tracker', 'slot-allocation', 'my-slots',
          'dept-announcements', 'dept-queries', 'alumni-connect', 'alumni', 'profile', 'student-details', 'analytics', 'virtual-interview'
        ],
        'faculty': [
          'faculty-dashboard', 'fa-students', 'fa-resume', 'fa-skills', 'fa-new-jobs',
          'fa-prev-jobs', 'attendance-tracker', 'slot-allocation', 'my-slots', 'alumni-connect', 'alumni', 'profile', 'student-details', 'virtual-interview'
        ],
        'admin': [
          'admin-dashboard', 'admin-setup', 'admin-staff', 'admin-roles', 'admin-mapping',
          'alumni-connect', 'alumni', 'profile', 'student-details', 'virtual-interview'
        ],
        'saas-admin': [
          'saas-admin', 'alumni-connect', 'alumni', 'profile', 'student-details', 'virtual-interview'
        ]
      };

      const userAllowed = allowedRoutes[role] || [];
      if (!userAllowed.includes(route)) {
        console.warn(`🛡️ RBAC: Blocked ${role} from accessing route [${route}]`);
        // Resolve home dashboard redirect based on role
        let homeRoute = 'student-dashboard';
        if (role === 'tpo') homeRoute = 'tpo-dashboard';
        else if (role === 'coordinator' || role === 'department') homeRoute = 'coordinator-dashboard';
        else if (role === 'faculty') homeRoute = 'faculty-dashboard';
        else if (role === 'admin') homeRoute = 'admin-dashboard';
        else if (role === 'saas-admin') homeRoute = 'saas-admin';

        window.location.hash = homeRoute;
        return;
      }
    }

    // 1. Render App Shell structure or update it dynamically
    if (isDash) {
      const existingShell = document.querySelector('.app-shell');
      if (!existingShell) {
        app.innerHTML = `
          <div class="app-shell">
            <nav class="sidebar" id="sidebar">${renderSidebar(role, route, user)}</nav>
            <main class="main-content" id="main-content">
              <div id="topbar-container">${renderTopbar(user, route)}</div>
              <div class="page-content page-transition-container" id="page-root"></div>
            </main>
          </div>`;
        initSidebar();
        // Badge initial render after shell mounts
        setTimeout(() => window.NotificationService?.refreshBadge(), 150);
      } else {
        // Dynamic sidebar and topbar updates without full page rebuild
        const sidebarEl = document.getElementById('sidebar');
        if (sidebarEl) {
          sidebarEl.innerHTML = renderSidebar(role, route, user);
          initSidebar();
        }
        const topbarContainer = document.getElementById('topbar-container');
        if (topbarContainer) {
          topbarContainer.innerHTML = renderTopbar(user, route);
          // Refresh badge after topbar re-render (badge span replaced by innerHTML)
          setTimeout(() => window.NotificationService?.refreshBadge(), 80);
        }
      }
    } else {
      const existingShell = document.querySelector('.app-shell');
      if (existingShell || !document.getElementById('page-root')) {
        app.innerHTML = `<div id="page-root" class="page-transition-container" style="min-height:100vh;"></div>`;
      }
    }

    const pageRoot = document.getElementById('page-root');
    if (!pageRoot) return;

    // Reset inline layout styles applied by special routes (e.g. virtual-interview)
    pageRoot.style.padding = '';
    pageRoot.style.maxWidth = '';
    pageRoot.style.height = '';
    pageRoot.style.overflow = '';
    pageRoot.style.minHeight = '';

    // Helper to reset all window and element scroll positions to top
    const resetScrollToTop = () => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      const mainContent = document.querySelector('.main-content');
      if (mainContent) mainContent.scrollTop = 0;
    };

    // Clean previous views to prevent vertical DOM stacking
    pageRoot.innerHTML = '';

    // Create incoming view wrapper with skeleton placeholder so height never collapses to 0px
    const incomingView = document.createElement('div');
    incomingView.className = 'page-view page-view-active';
    const skType = ['drives', 'dept-students', 'fa-students', 'alumni-connect', 'queries'].includes(route) ? 'list' : 'dashboard';
    incomingView.innerHTML = renderSkeleton(skType);
    pageRoot.appendChild(incomingView);

    // Reset scroll position before loading content
    resetScrollToTop();

    // Resolve loader safely with timeout guard
    const loader = routes[route] || routes[''];
    console.log(`🚀 Router: Executing loader for [${route}] ->`, loader.name || 'Anonymous');
    
    try {
      await Promise.race([
        loader(incomingView, Store, supabase),
        new Promise(resolve => setTimeout(resolve, 3000))
      ]);
    } catch (loaderErr) {
      console.warn(`⚠️ Router loader warning for [${route}]:`, loaderErr);
    }

    // Reset scroll position AGAIN after page content is populated
    resetScrollToTop();
    requestAnimationFrame(resetScrollToTop);
    setTimeout(resetScrollToTop, 100);

    // Dismiss boot loader if it exists
    const bootLoader = document.getElementById('placenix-loader');
    if (bootLoader && !bootLoader.classList.contains('fade-out')) {
      bootLoader.classList.add('fade-out');
      setTimeout(() => bootLoader.remove(), 500);
    }

    window.dispatchEvent(new CustomEvent('page-transition-complete'));

    // Save previous route on successful navigation
    window.previousRoute = route;

  } catch (err) {
    console.error('❌ Router Error:', err);
    const bootLoader = document.getElementById('placenix-loader');
    if (bootLoader) {
      bootLoader.classList.add('fade-out');
      setTimeout(() => bootLoader.remove(), 500);
    }
    app.innerHTML = `
      <div style="padding:40px; text-align:center; background:#09090b; min-height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#fff;">
        <div style="font-size:48px; margin-bottom:24px;">⚠️</div>
        <h2 style="font-weight:800; font-size:24px;">Neural Link Failure</h2>
        <p style="color:#a1a1aa; margin-top:12px; max-width:400px; line-height:1.6;">The application encountered a terminal error while mounting the <strong>${route || 'root'}</strong> node.</p>
        <code style="display:block; margin-top:24px; padding:12px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.1); border-radius:8px; color:#ef4444; font-size:12px;">${err.message}</code>
        <button style="margin-top:32px; padding:12px 24px; background:#7c3aed; color:#fff; border:none; border-radius:8px; font-weight:700; cursor:pointer;" onclick="location.reload();">Retry Lifecycle</button>
      </div>`;
  }
}

function initSidebar() {
  document.getElementById('logout-btn')?.addEventListener('click', async (e) => {
    e.preventDefault();
    
    // Reset all session and application state locally immediately
    Store.students = [];
    Store.drives = [];
    Store.alumni = [];
    Store.interviews = [];
    Store.session.user = null;
    Store.session.role = 'guest';
    localStorage.removeItem('placenix-mock-session');
    
    // Redirect to login screen instantly
    window.location.hash = 'login';
    
    // Process server-side logout in the background
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.error('Error during Supabase signOut:', err);
      }
    }
  });
}

export function initRouter() {
  window.addEventListener('hashchange', handleRoute);
  handleRoute();
}
