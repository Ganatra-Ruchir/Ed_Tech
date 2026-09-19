/**
 * In-memory login lockout, keyed by normalized email.
 *
 * This guards against unlimited online password guessing against a known
 * account. It is intentionally simple: a fixed window of failed attempts
 * per key, then a cooldown. Known limitation -- this state lives in one
 * Node process's memory, so it resets on redeploy/restart and is NOT shared
 * across multiple serverless instances (each cold-started function gets its
 * own counter). That's an acceptable tradeoff for this pilot's single-process
 * deployment target; a multi-instance production deployment should move this
 * to a shared store (Redis, or a DB table) instead.
 */

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

type Entry = { failures: number; windowStart: number; lockedUntil: number | null };

const attempts = new Map<string, Entry>();

function keyFor(email: string): string {
  return email.trim().toLowerCase();
}

/** Call before verifying a password. Returns the remaining lockout seconds
 * if this key is currently locked out, or null if the attempt may proceed. */
export function checkLoginLockout(email: string): number | null {
  const entry = attempts.get(keyFor(email));
  if (!entry?.lockedUntil) return null;
  const remainingMs = entry.lockedUntil - Date.now();
  if (remainingMs <= 0) {
    attempts.delete(keyFor(email));
    return null;
  }
  return Math.ceil(remainingMs / 1000);
}

/** Call after a failed password check. */
export function recordLoginFailure(email: string): void {
  const key = keyFor(email);
  const now = Date.now();
  const entry = attempts.get(key);

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    attempts.set(key, { failures: 1, windowStart: now, lockedUntil: null });
    return;
  }

  entry.failures += 1;
  if (entry.failures >= MAX_ATTEMPTS) {
    entry.lockedUntil = now + LOCKOUT_MS;
  }
}

/** Call after a successful login to clear any accumulated failures. */
export function clearLoginFailures(email: string): void {
  attempts.delete(keyFor(email));
}
