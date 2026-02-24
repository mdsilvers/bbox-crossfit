import { createClient } from '@supabase/supabase-js';

// Capture recovery state from URL hash BEFORE Supabase processes and clears it
const hashParams = new URLSearchParams(window.location.hash.substring(1));
export const isPasswordRecoveryRedirect = hashParams.get('type') === 'recovery';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\s/g, '');
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').replace(/\s/g, '');

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// Force clear all Supabase-related localStorage
export function clearSupabaseStorage() {
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));
}
