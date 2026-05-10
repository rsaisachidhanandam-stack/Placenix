// ============================================================
// PLACENIX — APP ENTRY POINT
// ============================================================

import { initRouter } from './router.js';
import { initTheme  } from './theme.js';
import { initToast  } from './components/toast.js';
import { supabase   } from './supabase.js';
import Store          from './store.js';

async function initApp() {
  console.log('🚀 Placenix Initializing...');
  
  // 1. Initialize Global UI
  initTheme();
  initToast();

  // 2. Handle Supabase Session
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    // Fetch extended profile data
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
    
    Store.session.user = {
      id: session.user.id,
      email: session.user.email,
      ...session.user.user_metadata,
      ...(profile || {}) // Merge DB profile
    };
    Store.session.role = Store.session.user.role || 'student';
    console.log('👤 Active Session:', Store.session.user.full_name);
  }

  // 3. Listen for Auth Changes
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session) {
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      Store.session.user = { 
        id: session.user.id, 
        email: session.user.email, 
        ...session.user.user_metadata,
        ...(profile || {})
      };
      Store.session.role = Store.session.user.role || 'student';
      
      // If onboarding isn't done, force routing check
      if (!Store.session.user.onboarding_complete && Store.session.role === 'student') {
        window.location.hash = 'onboarding';
      }
    } else if (event === 'SIGNED_OUT') {
      Store.session.user = null;
      Store.session.role = 'guest';
      window.location.hash = 'login';
    }
  });

  // 4. Initialize Router
  initRouter();
}

// Start the app
document.addEventListener('DOMContentLoaded', initApp);
