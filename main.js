// ============================================================
// PLACENIX — APP ENTRY POINT (RESILIENT BOOT)
// ============================================================

import { initRouter } from './router.js';
import { initTheme  } from './theme.js';
import { initToast  } from './components/toast.js';
import { supabase   } from './supabase.js';
import Store          from './store.js';

async function bootApp() {
  console.log('🚀 Placenix: Resuming Standard Boot Sequence...');
  
  try {
    // 1. Initialize UI Environment
    initTheme();
    initToast();

    // 2. Start Router immediately
    initRouter();

    // 3. Handle Authentication if client is active
    if (supabase) {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        Store.session.user = { id: session.user.id, email: session.user.email, ...session.user.user_metadata };
        Store.session.role = Store.session.user.role || 'student';
        
        // Refresh UI with user data
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      }

      supabase.auth.onAuthStateChange((event, session) => {
        if (session) {
          Store.session.user = { id: session.user.id, email: session.user.email, ...session.user.user_metadata };
          Store.session.role = Store.session.user.role || 'student';
        } else {
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
