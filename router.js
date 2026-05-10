// ============================================================
// PLACENIX — HASH-BASED SPA ROUTER
// ============================================================

import { renderSidebar, renderTopbar } from './components/sidebar.js';
import { loadLandingPage }   from './pages/landing.js';
import { loadAuthPage }      from './pages/auth.js';
import { loadStudentDash }   from './pages/dashboard-student.js';
import { loadTPODash, loadAdminDash } from './pages/dashboard-tpo.js';
import { loadResumePage }    from './pages/resume-intelligence.js';
import { loadEmpPage }       from './pages/employability.js';
import { loadDrivesPage }    from './pages/drives.js';
import { loadKanbanPage }    from './pages/kanban.js';
import { loadAnalyticsPage } from './pages/analytics.js';
import { loadAlumniPage }    from './pages/alumni.js';
import { loadInterviewPage } from './pages/interview-repo.js';
import { loadCommPage }      from './pages/communication.js';
import { loadAIPage }        from './pages/ai-modules.js';
import { loadVirtualInterviewPage } from './pages/virtual-interview.js';
import { loadSaaSPage }      from './pages/saas-admin.js';
import { loadOnboardingPage }from './pages/onboarding.js';
import { loadProfilePage }   from './pages/profile.js';
import Store          from './store.js';
import { supabase }   from './supabase.js';

const DASHBOARD_PAGES = [
  'student-dashboard','tpo-dashboard','admin-dashboard',
  'profile','resume','employability','drives','kanban',
  'analytics','alumni','interview-repo','communication','ai-modules','saas-admin',
  'virtual-interview'
];

const routes = {
  '':                  (r,s) => loadLandingPage(r,s),
  'landing':           (r,s) => loadLandingPage(r,s),
  'login':             (r,s) => loadAuthPage(r,s,'login'),
  'signup':            (r,s) => loadAuthPage(r,s,'signup'),
  'otp':               (r,s) => loadAuthPage(r,s,'otp'),
  'student-dashboard': loadStudentDash,
  'tpo-dashboard':     loadTPODash,
  'admin-dashboard':   loadAdminDash,
  'resume':            loadResumePage,
  'employability':     loadEmpPage,
  'drives':            loadDrivesPage,
  'kanban':            loadKanbanPage,
  'analytics':         loadAnalyticsPage,
  'alumni':            loadAlumniPage,
  'interview-repo':    loadInterviewPage,
  'communication':     loadCommPage,
  'ai-modules':        loadAIPage,
  'virtual-interview': loadVirtualInterviewPage,
  'saas-admin':        loadSaaSPage,
  'onboarding':        (r,s) => loadOnboardingPage(r,s),
  'profile':           loadProfilePage,
};

function getRoute() {
  // Normalize route: remove hash, remove query params, and convert underscores to hyphens
  let raw = window.location.hash.replace('#','').split('?')[0] || '';
  return raw.replace(/_/g, '-'); 
}

async function handleRoute() {
  const route = getRoute();
  console.log('🛣️ Routing to:', route);

  const app   = document.getElementById('app');
  const isDash = DASHBOARD_PAGES.includes(route);
  
  // 1. Auth Guard
  if (isDash && !Store.session.user) {
    console.warn('🔒 Unauthorized access. Redirecting to login...');
    window.location.hash = 'login';
    return;
  }

  // 2. Onboarding Guard
  if (isDash && Store.session.user && !Store.session.user.onboarding_complete) {
    console.warn('🚧 Onboarding incomplete. Redirecting...');
    window.location.hash = 'onboarding';
    return;
  }
  
  if (route === 'onboarding' && !Store.session.user) {
    window.location.hash = 'login';
    return;
  }

  const loader = routes[route] || routes[''];

  app.style.opacity = '0';
  app.style.transform = 'translateY(8px)';
  
  await sleep(100);

  try {
    if (isDash) {
      app.innerHTML = `
        <div class="app-shell">
          <nav class="sidebar" id="sidebar">
            ${renderSidebar(Store.session.role, route, Store.session.user)}
          </nav>
          <div class="main-content" id="main-content">
            ${renderTopbar(Store.session.user, route)}
            <div class="page-content">
              <div id="page-root"></div>
            </div>
          </div>
        </div>`;
      const pageRoot = document.getElementById('page-root');
      await loader(pageRoot, Store);
      initSidebar();
    } else {
      app.innerHTML = `<div id="page-root"></div>`;
      await loader(document.getElementById('page-root'), Store);
    }
  } catch (err) {
    console.error('❌ Router Error:', err);
    app.innerHTML = `<div style="padding:40px;text-align:center;"><h2>Page Load Error</h2><p>${err.message}</p><a href="#landing">Back to Home</a></div>`;
  }

  requestAnimationFrame(() => {
    app.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    app.style.opacity = '1';
    app.style.transform = 'translateY(0)';
  });

  window.scrollTo({ top: 0 });
}

function initSidebar() {
  const sidebar = document.getElementById('sidebar');
  const main    = document.getElementById('main-content');

  document.getElementById('sidebar-collapse-btn')?.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
    main.classList.toggle('sidebar-collapsed');
  });

  document.getElementById('mobile-menu-btn')?.addEventListener('click', () => {
    sidebar.classList.toggle('mobile-open');
  });

  document.getElementById('logout-btn')?.addEventListener('click', async () => {
    await supabase.auth.signOut();
  });

  document.querySelectorAll('[data-route]').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      window.location.hash = el.getAttribute('data-route').replace(/_/g, '-');
    });
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

export function initRouter() {
  window.addEventListener('hashchange', handleRoute);
  handleRoute();
}
