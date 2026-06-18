import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

let initialized = false;
let _adminAuth: ReturnType<typeof getAuth>;
let _adminDb: ReturnType<typeof getFirestore>;

let _lastInitError: string | null = null;

export function getInitError(): string | null {
  return _lastInitError;
}

function init() {
  if (initialized) return;
  try {
    const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    if (!key) {
      _lastInitError = 'FIREBASE_SERVICE_ACCOUNT_KEY env var not set on Vercel';
      throw new Error(_lastInitError);
    }

    const app =
      getApps().length === 0
        ? initializeApp({ credential: cert(JSON.parse(key)) })
        : getApps()[0];

    _adminAuth = getAuth(app);
    _adminDb = getFirestore(app);
    initialized = true;
    _lastInitError = null;
  } catch (err) {
    _lastInitError = err instanceof Error ? err.message : String(err);
    console.error('[Firebase Init Error]', _lastInitError);
    throw err;
  }
}

export function getAdminAuth() {
  init();
  return _adminAuth;
}

export function getAdminDb() {
  init();
  return _adminDb;
}
