import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ─── SUPABASE CONFIG ───────────────────────────────────────
// Environment variables (set in Vercel or .env.local)
// Fallback to hardcoded values for local development
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://psyqlhqlshadlpxhjsdw.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBzeXFsaHFsc2hhZGxweGhqc2R3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwNjE4MjMsImV4cCI6MjA5NjYzNzgyM30.ixv_-6L9D6_gls_F-lr-XmQmC2iwoMIqFng4OppTKPw';
// ─────────────────────────────────────────────────────────────

let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!supabaseInstance) {
    supabaseInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return supabaseInstance;
}

export async function signInWithGoogle() {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
    },
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const supabase = getSupabase();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession() {
  const supabase = getSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}
