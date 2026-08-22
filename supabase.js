// ============================================================
// PLACENIX — SUPABASE CLIENT (ULTRA RESILIENT)
// ============================================================

const env = (typeof window !== 'undefined' && window.__ENV__) ? window.__ENV__ : {};
const supabaseUrl = env.SUPABASE_URL || '';
const supabaseAnonKey = env.SUPABASE_ANON_KEY || '';

let client = null;

try {
  // Use global if available (from script tag in index.html)
  if (typeof window !== 'undefined' && window.supabase && supabaseUrl && supabaseAnonKey) {
    client = window.supabase.createClient(supabaseUrl, supabaseAnonKey);
  } else {
    console.warn('⚠️ Supabase credentials missing from configuration.');
  }
} catch (e) {
  console.warn('⚠️ Supabase global initialization failed:', e);
}

export const supabase = client;
