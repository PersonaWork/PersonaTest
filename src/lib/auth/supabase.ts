import { createClient } from '@supabase/supabase-js'

// Singleton pattern to prevent multiple GoTrueClient instances
let supabaseClient: ReturnType<typeof createClient> | null = null;
let supabaseAdminClient: ReturnType<typeof createClient> | null = null;

function getEnvVar(name: string, required = true): string | undefined {
  const value = process.env[name];
  if (required && !value) {
    console.error(`Missing required environment variable: ${name}`);
    return undefined;
  }
  return value;
}

export const supabase = (() => {
  if (supabaseClient) return supabaseClient;
  
  const url = getEnvVar('NEXT_PUBLIC_SUPABASE_URL');
  const key = getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  
  if (!url || !key) {
    // Return a dummy client that will show clear errors
    throw new Error(
      'Supabase configuration missing. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.'
    );
  }
  
  supabaseClient = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    }
  });
  return supabaseClient;
})();

export const supabaseAdmin = (() => {
  if (supabaseAdminClient) return supabaseAdminClient;
  
  const url = getEnvVar('NEXT_PUBLIC_SUPABASE_URL');
  const key = getEnvVar('SUPABASE_SERVICE_ROLE_KEY', false);
  
  if (!url || !key) {
    throw new Error(
      'Supabase admin configuration missing. Please set SUPABASE_SERVICE_ROLE_KEY environment variable.'
    );
  }
  
  supabaseAdminClient = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  return supabaseAdminClient;
})();
