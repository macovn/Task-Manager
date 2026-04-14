import { createClient } from '@supabase/supabase-js';

// Debug log for Vercel deployment
if (typeof window !== 'undefined') {
  console.log("SUPABASE CLIENT ENV CHECK:", {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'PRESENT' : 'MISSING',
    key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'PRESENT' : 'MISSING'
  });
}

export function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('Supabase credentials missing! Check Vercel Environment Variables.');
  }

  return createClient(url, key);
}
