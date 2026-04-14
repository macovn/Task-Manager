import { createClient } from '@supabase/supabase-js';

// Debug log for Vercel deployment
console.log("SUPABASE URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase credentials missing! Check Vercel Environment Variables.');
}

export const supabase = createClient(
  supabaseUrl!,
  supabaseAnonKey!
);
