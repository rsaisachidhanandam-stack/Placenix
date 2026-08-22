// ============================================================
// PLACENIX — APP ENTRY POINT (RESILIENT BOOT)
// ============================================================

import { initRouter } from './router.js';
import { initTheme  } from './theme.js';
import { initToast  } from './components/toast.js';
import NotificationService from './components/notifications.js';
import { supabase   } from './supabase.js';
import Store, { syncWithSupabase, loadStoreFromLocalStorage } from './store.js';

function resolveUserRole(user) {
  if (!user) return 'guest';
  const email = (user.email || '').toLowerCase().trim();
  
  if (email.startsWith('fa') || email.includes('faculty') || email.includes('advisor')) return 'faculty';
  if (email.startsWith('dept') || email.includes('coordinator')) return 'coordinator';
  if (email.includes('tpo') || email.includes('placement')) return 'tpo';
  if (email.includes('admin') || email.includes('saas')) return 'admin';
  
  const savedRole = localStorage.getItem('placenix_active_role');
  if (savedRole && savedRole !== 'student') return savedRole;
  
  return user.role || 'student';
}

async function bootApp() {
  console.log('🚀 Placenix: Resuming Standard Boot Sequence...');
  
  try {
    // 1. Initialize UI Environment
    initTheme();
    initToast();

    // Attach NotificationService globally and initialize
    window.NotificationService = NotificationService;
    NotificationService.init(Store, supabase);

    // 2. Load any existing local sandbox/mock session only when on deep dashboard routes
    const currentHash = window.location.hash.replace('#', '').split('?')[0];
    const mockSessionStr = localStorage.getItem('placenix-mock-session');
    if (mockSessionStr && currentHash && currentHash !== 'login' && currentHash !== 'signup') {
      try {
        const mockUser = JSON.parse(mockSessionStr);
        Store.session.user = mockUser;
        const role = resolveUserRole(mockUser);
        Store.session.user.role = role;
        Store.session.role = role;
        console.log('🔄 Sandbox session loaded on boot:', mockUser.email, 'Role:', role);
      } catch (e) {
        console.error("Failed to parse mock session:", e);
      }
    }

    // 3. Handle Authentication if client is active
    if (supabase) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          // Clear mock session if we log in with a real one
          localStorage.removeItem('placenix-mock-session');
          
          Store.session.user = { id: session.user.id, email: session.user.email, ...session.user.user_metadata };
          
          // Sync profile details from Supabase profiles database table
          try {
            const { data: dbUser } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
            if (dbUser) {
              const merged = { ...Store.session.user };
              Object.keys(dbUser).forEach(k => {
                if (dbUser[k] !== null && dbUser[k] !== undefined && dbUser[k] !== '') {
                  merged[k] = dbUser[k];
                }
              });
              Store.session.user = merged;
            }
          } catch (e) {
            console.error("Failed to sync profile from database at boot:", e);
          }
          
          const role = resolveUserRole(Store.session.user);
          Store.session.user.role = role;
          Store.session.role = role;
        }
      } catch (authErr) {
        console.error("Error getting Supabase session during boot:", authErr);
      }

      supabase.auth.onAuthStateChange(async (event, session) => {
        if (session) {
          // Clear mock session if we log in with a real one
          localStorage.removeItem('placenix-mock-session');
          
          // Restore store from local storage first to populate local drives/students
          loadStoreFromLocalStorage();
          Store.session.user = { id: session.user.id, email: session.user.email, ...session.user.user_metadata };
          
          try {
            const { data: dbUser } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
            if (dbUser) {
              const merged = { ...Store.session.user };
              Object.keys(dbUser).forEach(k => {
                if (dbUser[k] !== null && dbUser[k] !== undefined && dbUser[k] !== '') {
                  merged[k] = dbUser[k];
                }
              });
              Store.session.user = merged;
            }
          } catch (e) {
            console.error("Failed to sync profile from database on auth change:", e);
          }

          const role = resolveUserRole(Store.session.user);
          Store.session.user.role = role;
          Store.session.role = role;
          window.dispatchEvent(new CustomEvent('store-updated'));
          
          // Trigger re-render of active route without forcing redirect away from login page on boot
          const currentHash = window.location.hash.replace('#', '').split('?')[0];
          if (event === 'SIGNED_IN') {
            const roleHashMap = {
              'student': 'student-dashboard',
              'faculty': 'faculty-dashboard',
              'tpo': 'tpo-dashboard',
              'department': 'coordinator-dashboard',
              'coordinator': 'coordinator-dashboard',
              'admin': 'admin-dashboard',
              'saas-admin': 'saas-admin'
            };
            window.location.hash = roleHashMap[role] || 'student-dashboard';
          } else {
            window.dispatchEvent(new HashChangeEvent('hashchange'));
          }
        } else {
          // If sandbox session is active, ignore initial null session event
          if (localStorage.getItem('placenix-mock-session')) {
            console.log('Sandbox mode session active. Ignoring initial null Supabase auth state change.');
            return;
          }
          
          Store.students = [];
          Store.drives = [];
          Store.alumni = [];
          Store.interviews = [];
          Store.session.user = null;
          Store.session.role = 'guest';
          if (event === 'SIGNED_OUT') {
            window.location.hash = 'login';
          } else {
            window.dispatchEvent(new HashChangeEvent('hashchange'));
          }
        }
      });
    }

    // 4. Start Router AFTER session check is resolved
    initRouter();
    // Expose Store globally for ⌘K search in topbar
    window.__PlacenixStore = Store;

    // 5. Sync Institutional Data Registry in background (non-blocking)
    if (supabase) {
      syncWithSupabase(supabase).catch(err => console.error('Registry sync error:', err));
    }

  } catch (err) {
    console.error('🔥 Fatal Boot Error:', err);
    const bootLoader = document.getElementById('placenix-loader');
    if (bootLoader) {
      bootLoader.classList.add('fade-out');
      setTimeout(() => bootLoader.remove(), 500);
    }
  }
}

document.addEventListener('DOMContentLoaded', bootApp);
