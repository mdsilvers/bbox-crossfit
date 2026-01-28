import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nrvjagntnerqelucxamg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ydmphZ250bmVycWVsdWN4YW1nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1NzQwMDcsImV4cCI6MjA4NTE1MDAwN30.KU_RB-yufXJTqea7D98erj6RKzQUebhbNFFcxYRqxN4';

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
