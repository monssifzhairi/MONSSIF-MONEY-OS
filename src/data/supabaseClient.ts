/**
 * Single Supabase client for the whole app.
 *
 * Security rules:
 *  - Only the **anon/publishable** key is ever used in frontend code.
 *    The service-role key must never appear in any frontend file or env var.
 *  - Authentication (password hashing, token storage, session refresh) is
 *    handled entirely by Supabase Auth. This app never stores or hashes
 *    passwords itself.
 *  - The client is created lazily, only when both env vars are configured.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { isSupabaseConfigured } from './repository';

let client: SupabaseClient | null = null;

export function getSupabaseUrl(): string {
  return import.meta.env.VITE_SUPABASE_URL as string;
}

export function getSupabaseAnonKey(): string {
  return import.meta.env.VITE_SUPABASE_ANON_KEY as string;
}

export function getSupabaseClient(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
    );
  }
  if (!client) {
    client = createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
      auth: {
        // Persistent sessions: Supabase Auth stores the session securely and
        // refreshes tokens automatically — "remember me" without a fake toggle.
        persistSession: true,
        autoRefreshToken: true,
        // Handles recovery / magic-link tokens landing in the URL.
        detectSessionInUrl: true,
      },
    });
  }
  return client;
}

/** Test-only helper to drop the cached client between mocked test cases. */
export function __resetSupabaseClientForTests(): void {
  client = null;
}
