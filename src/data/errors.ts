/** Shared data-layer error types (kept separate so repository modules stay decoupled). */

export class ValidationError extends Error {
  constructor(public readonly errors: Record<string, string>) {
    super(Object.values(errors)[0] ?? 'Invalid input');
    this.name = 'ValidationError';
  }
}

/** Thrown when Supabase is configured but no user is signed in yet. */
export class AuthRequiredError extends Error {
  constructor(message = 'Sign in to continue.') {
    super(message);
    this.name = 'AuthRequiredError';
  }
}
