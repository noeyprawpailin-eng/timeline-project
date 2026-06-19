let _adminDb: any;
let _initPromise: Promise<void> | null = null;

async function init() {
  const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  let credentialJson: string;
  if (key) {
    credentialJson = key;
  } else if (keyPath) {
    const { readFileSync } = await import('fs');
    credentialJson = readFileSync(keyPath, 'utf-8');
  } else {
    throw new Error('Missing Firebase credential. Set FIREBASE_SERVICE_ACCOUNT_KEY (Vercel) or GOOGLE_APPLICATION_CREDENTIALS (local)');
  }

  const { initializeApp, getApps, cert } = await import('firebase-admin/app');
  const { getFirestore } = await import('firebase-admin/firestore');

  const app =
    getApps().length === 0
      ? initializeApp({ credential: cert(JSON.parse(credentialJson)) })
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
