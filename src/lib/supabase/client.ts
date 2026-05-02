import { createClient } from '@supabase/supabase-js';

let supabaseInstance: any = null;

export function getSupabaseClient() {
  if (supabaseInstance) return supabaseInstance;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

  // Debug log for Vercel deployment
  if (typeof window !== 'undefined') {
    console.log("SUPABASE CLIENT CONFIG:", {
      url: url ? 'FOUND' : 'MISSING',
      key: key ? 'FOUND' : 'MISSING'
    });
  }

  if (!url || !key || url === 'undefined' || key === 'undefined') {
    console.error('CRITICAL: Supabase credentials missing or invalid!');
    // Return a dummy client to prevent immediate crash, but it will fail on use
    return createClient('https://placeholder.supabase.co', 'placeholder');
  }

  supabaseInstance = createClient(url, key);
  return supabaseInstance;
}
