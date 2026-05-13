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

import { renderSidebar, renderTopbar } from './components/sidebar.js';
import { supabase   } from './supabase.js';
import Store          from './store.js';

const DASHBOARD_PAGES = [
  'student-dashboard', 'tpo-dashboard', 'admin-dashboard',
  'student-details', 'profile', 'employability', 'skill-analysis', 
  'drives', 'new-applications', 'my-applications', 'completed-batches',
  'alumni', 'alumni-connect', 'analytics', 'ai-modules', 'ai-predictor',
  'interview-repo', 'communication', 'queries', 'virtual-interview', 
  'faculty-advisor', 'admin-dept', 'resume', 'resume-analysis', 'kanban', 'saas-admin',
  'dept-students', 'dept-resume', 'dept-skills', 'dept-new-jobs', 'dept-prev-jobs', 'dept-announcements', 'dept-queries'
];

const routes = {
  '':                  loadLandingPage,
  'login':             (r,s,sb) => loadAuthPage(r,s,'login',sb),
  'signup':            (r,s,sb) => loadAuthPage(r,s,'signup',sb),
  'onboarding':        loadOnboardingPage,
  'student-dashboard': loadStudentDash,
  'tpo-dashboard':     loadTPODash,
  'admin-dashboard':   loadDeptDash,
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
  'kanban':            loadDrivesPage,
  'saas-admin':        loadLandingPage,
  'dept-students':      loadDeptStudents,
  'dept-resume':        loadDeptResume,
  'dept-skills':        loadDeptSkills,
  'dept-new-jobs':      loadDeptNewJobs,
  'dept-prev-jobs':      loadDeptPrevJobs,
  'dept-announcements': loadDeptAnnouncements,
  'dept-queries':       loadDeptQueries
};

function getRoute() {
  const hash = window.location.hash || '#';
  let raw = hash.replace('#', '') || '';
  if (raw.startsWith('/')) raw = raw.substring(1);
  return raw.replace(/_/g, '-').toLowerCase(); 
}

async function handleRoute() {
  const route = getRoute();
  console.log('🧭 Router: Transitioning to node ->', route);
  console.table(Object.keys(routes));
  const app   = document.getElementById('app');
  if (!app) return;

  try {
    const isDash = DASHBOARD_PAGES.includes(route);
    const user   = Store.session?.user;
    const role   = Store.session?.role || 'guest';

    if (isDash) {
      app.innerHTML = `
        <div class="app-shell">
          <nav class="sidebar" id="sidebar">${renderSidebar(role, route, user)}</nav>
          <main class="main-content" id="main-content">
            ${renderTopbar(user, route)}
            <div class="page-content" id="page-root">
              <div style="padding:100px; text-align:center; color:var(--text-muted);">
                <div class="animate-spin" style="width:32px; height:32px; border:3px solid var(--border-subtle); border-top-color:var(--brand-primary); border-radius:50%; margin:0 auto 20px;"></div>
                Calibrating Interface Nodes...
              </div>
            </div>
          </main>
        </div>`;
    } else {
      app.innerHTML = `<div id="page-root"></div>`;
    }

    const pageRoot = document.getElementById('page-root');
    const loader   = routes[route] || routes[''];
    
    console.log(`🚀 Router: Executing loader for [${route}] ->`, loader.name || 'Anonymous');
    await loader(pageRoot, Store, supabase);
    if (isDash) initSidebar();

  } catch (err) {
    console.error('❌ Router Error:', err);
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
  document.getElementById('logout-btn')?.addEventListener('click', async () => {
    if (supabase) await supabase.auth.signOut();
    location.reload();
  });
}

export function initRouter() {
  window.addEventListener('hashchange', handleRoute);
  handleRoute();
}
