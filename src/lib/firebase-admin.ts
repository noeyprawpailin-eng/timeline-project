let initialized = false;
let _adminAuth: any;
let _adminDb: any;

let _initPromise: Promise<void> | null = null;
let _lastInitError: string | null = null;

export function getInitError(): string | null {
  return _lastInitError;
}

async function init() {
  if (initialized) return;
  try {
    const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    if (!key) {
      _lastInitError = 'FIREBASE_SERVICE_ACCOUNT_KEY env var not set on Vercel';
      throw new Error(_lastInitError);
    }

    const { initializeApp, getApps, cert } = await import('firebase-admin/app');
    const { getAuth: _getAuth } = await import('firebase-admin/auth');
    const { getFirestore: _getFirestore } = await import('firebase-admin/firestore');

    const app =
      getApps().length === 0
        ? initializeApp({ credential: cert(JSON.parse(key)) })
        : getApps()[0];

    _adminAuth = _getAuth(app);
    _adminDb = _getFirestore(app);
    initialized = true;
    _lastInitError = null;
  } catch (err) {
    _lastInitError = err instanceof Error ? err.message : String(err);
    console.error('[Firebase Init Error]', _lastInitError);
    throw err;
  }
}

function ensureInit() {
  if (!_initPromise) {
    _initPromise = init().catch((e) => {
      _initPromise = null;
      throw e;
    });
  }
  return _initPromise;
}

export async function getAdminDb() {
  await ensureInit();
  return _adminDb;
}

export async function getAdminAuth() {
  await ensureInit();
  return _adminAuth;
}
