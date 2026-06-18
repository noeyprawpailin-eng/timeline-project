let _adminDb: any;
let _initPromise: Promise<void> | null = null;

async function init() {
  const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!key) throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY env var not set on Vercel');

  const { initializeApp, getApps, cert } = await import('firebase-admin/app');
  const { getFirestore } = await import('firebase-admin/firestore');

  const app =
    getApps().length === 0
      ? initializeApp({ credential: cert(JSON.parse(key)) })
      : getApps()[0];

  _adminDb = getFirestore(app);
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
