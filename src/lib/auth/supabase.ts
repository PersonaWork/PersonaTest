import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Lazy initialization to prevent crashes when env vars are missing
let supabaseClient: SupabaseClient | null = null;
let supabaseAdminClient: SupabaseClient | null = null;

function getEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

function getFirstEnvVar(names: string[], label: string): string {
  for (const name of names) {
    const value = process.env[name];
    if (value) return value;
  }
  throw new Error(`Missing environment variable: ${label} (tried: ${names.join(', ')})`);
}

function createSupabaseClient(): SupabaseClient {
  const url = getEnvVar('NEXT_PUBLIC_SUPABASE_URL');
  // Supabase JS client uses the project's public "anon" key.
  // Some dashboards/tools call this "publishable". Support common aliases.
  const key = getFirstEnvVar(
    [
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
      'NEXT_PUBLIC_SUPABASE_PUBLIC_KEY'
    ],
    'NEXT_PUBLIC_SUPABASE_ANON_KEY'
  );
  
  return createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    }
  });
}

function createSupabaseAdmin(): SupabaseClient {
  const url = getEnvVar('NEXT_PUBLIC_SUPABASE_URL');
  const key = getEnvVar('SUPABASE_SERVICE_ROLE_KEY');
  
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

// Lazy getters - client only created when first accessed
export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    supabaseClient = createSupabaseClient();
  }
  return supabaseClient;
}

export function getSupabaseAdmin(): SupabaseClient {
  if (!supabaseAdminClient) {
    supabaseAdminClient = createSupabaseAdmin();
  }
  return supabaseAdminClient;
}

// Backward-compatible exports - lazy initialization happens on first use
// We use a class-based wrapper that delegates all property access to the actual client
class SupabaseClientWrapper {
  private client: SupabaseClient | null = null;
  
  private getClient(): SupabaseClient {
    if (!this.client) {
      this.client = createSupabaseClient();
    }
    return this.client;
  }
  
  get auth() {
    return this.getClient().auth;
  }
  
  get storage() {
    return this.getClient().storage;
  }
  
  get functions() {
    return this.getClient().functions;
  }
  
  get realtime() {
    return this.getClient().realtime;
  }
  
  // Support for any other properties/methods
  from(table: string) {
    return this.getClient().from(table);
  }
  
  rpc(fn: string, args?: any) {
    return this.getClient().rpc(fn, args);
  }
}

class SupabaseAdminWrapper {
  private client: SupabaseClient | null = null;
  
  private getClient(): SupabaseClient {
    if (!this.client) {
      this.client = createSupabaseAdmin();
    }
    return this.client;
  }
  
  get auth() {
    return this.getClient().auth;
  }
  
  from(table: string) {
    return this.getClient().from(table);
  }
  
  rpc(fn: string, args?: any) {
    return this.getClient().rpc(fn, args);
  }
}

export const supabase = new SupabaseClientWrapper() as unknown as SupabaseClient;
export const supabaseAdmin = new SupabaseAdminWrapper() as unknown as SupabaseClient;
