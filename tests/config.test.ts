/**
 * Production environment validation (getSupabaseConfigIssue / isSupabaseConfigured).
 *
 * Rules under test:
 *  - Neither var set  → intentional local mode (no error, not configured).
 *  - Both set, valid  → configured.
 *  - Partial config   → explicit error (never silently "not configured").
 *  - service-role key → explicit error (must never ship to browsers).
 *  - http:// non-local, truncated key, malformed URL → explicit error.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getSupabaseConfigIssue, isSupabaseConfigured } from '../src/data/repository';

function b64url(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj)).toString('base64url');
}

function fakeJwt(payload: Record<string, unknown>): string {
  return `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url(payload)}.sig-part`;
}

const VALID_JWT = fakeJwt({ role: 'anon', iss: 'supabase' });
const SERVICE_JWT = fakeJwt({ role: 'service_role', iss: 'supabase' });

beforeEach(() => {
  vi.stubEnv('VITE_SUPABASE_URL', '');
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('getSupabaseConfigIssue', () => {
  it('accepts an intentional unconfigured app (local/demo mode)', () => {
    expect(getSupabaseConfigIssue()).toBeNull();
    expect(isSupabaseConfigured()).toBe(false);
  });

  it('accepts a complete, valid configuration', () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://abc.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', VALID_JWT);
    expect(getSupabaseConfigIssue()).toBeNull();
    expect(isSupabaseConfigured()).toBe(true);
  });

  it('flags a missing URL when the key is present', () => {
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', VALID_JWT);
    expect(getSupabaseConfigIssue()).toMatch(/VITE_SUPABASE_URL is missing/);
    expect(isSupabaseConfigured()).toBe(false);
  });

  it('flags a missing key when the URL is present', () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://abc.supabase.co');
    expect(getSupabaseConfigIssue()).toMatch(/VITE_SUPABASE_ANON_KEY is missing/);
    expect(isSupabaseConfigured()).toBe(false);
  });

  it('refuses a service-role key (JWT role claim)', () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://abc.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', SERVICE_JWT);
    expect(getSupabaseConfigIssue()).toMatch(/SERVICE-ROLE/);
    expect(isSupabaseConfigured()).toBe(false);
  });

  it('refuses a key containing the service_role marker', () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://abc.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'prefix-service_role-suffix-1234567890');
    expect(getSupabaseConfigIssue()).toMatch(/SERVICE-ROLE/);
  });

  it('refuses a non-https URL outside localhost', () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'http://abc.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', VALID_JWT);
    expect(getSupabaseConfigIssue()).toMatch(/https/);
  });

  it('allows http on localhost (local Supabase CLI)', () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'http://localhost:54321');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', VALID_JWT);
    expect(getSupabaseConfigIssue()).toBeNull();
  });

  it('refuses a malformed URL', () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'not-a-url');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', VALID_JWT);
    expect(getSupabaseConfigIssue()).toMatch(/https:\/\//);
  });

  it('refuses a truncated key', () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://abc.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'short');
    expect(getSupabaseConfigIssue()).toMatch(/truncated|invalid/);
  });

  it('never throws on garbage key material', () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://abc.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'aaaa.bbbb.cccc');
    expect(() => getSupabaseConfigIssue()).not.toThrow();
  });
});
