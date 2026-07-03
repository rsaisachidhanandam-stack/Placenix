// ============================================================
// PLACENIX — APP ENTRY POINT (RESILIENT BOOT)
// ============================================================

import { initRouter } from './router.js';
import { initTheme  } from './theme.js';
import { initToast  } from './components/toast.js';
import { supabase   } from './supabase.js';
import Store, { syncWithSupabase, loadStoreFromLocalStorage } from './store.js';

async function bootApp() {
  console.log('🚀 Placenix: Resuming Standard Boot Sequence...');
  
  try {
    // 1. Initialize UI Environment
    initTheme();
    initToast();

    // 2. Start Router immediately
    initRouter();

    // 2b. Sync Institutional Data Registry in background (non-blocking)
    if (supabase) {
      syncWithSupabase(supabase).catch(err => console.error('Registry sync error:', err));
    }

    // 3. Handle Authentication if client is active
    if (supabase) {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        Store.session.user = { id: session.user.id, email: session.user.email, ...session.user.user_metadata };
        
        // Sync profile details from Supabase profiles database table
        try {
          const { data: dbUser } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
          if (dbUser) {
            Store.session.user = { ...Store.session.user, ...dbUser };
          }
        } catch (e) {
          console.error("Failed to sync profile from database at boot:", e);
        }
        
        Store.session.role = Store.session.user.role || 'student';
        
        // Refresh UI with user data
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      }

      supabase.auth.onAuthStateChange(async (event, session) => {
        if (session) {
          // Restore store from local storage first to populate local drives/students
          loadStoreFromLocalStorage();
          Store.session.user = { id: session.user.id, email: session.user.email, ...session.user.user_metadata };
          
          try {
            const { data: dbUser } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
            if (dbUser) {
              Store.session.user = { ...Store.session.user, ...dbUser };
            }
          } catch (e) {
            console.error("Failed to sync profile from database on auth change:", e);
          }
          
          Store.session.role = Store.session.user.role || 'student';
          window.dispatchEvent(new CustomEvent('store-updated'));
        } else {
          Store.students = [];
          Store.drives = [];
          Store.alumni = [];
          Store.interviews = [];
          Store.session.user = null;
          Store.session.role = 'guest';
          window.location.hash = 'login';
        }
      });
    }

  } catch (err) {
    console.error('🔥 Fatal Boot Error:', err);
    // index.html diagnostic layer will handle visibility
  }
}

document.addEventListener('DOMContentLoaded', bootApp);
