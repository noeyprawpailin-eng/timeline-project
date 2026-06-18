import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

let initialized = false;
let _adminAuth: ReturnType<typeof getAuth>;
let _adminDb: ReturnType<typeof getFirestore>;

function init() {
  if (initialized) return;
  try {
    const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    const path = process.env.GOOGLE_APPLICATION_CREDENTIALS;

    let credential: string;
    if (key) {
      credential = key;
    } else if (path) {
      credential = readFileSync(path, 'utf-8');
    } else {
      throw new Error(
        'FIREBASE_SERVICE_ACCOUNT_KEY or GOOGLE_APPLICATION_CREDENTIALS not set'
      );
    }

    const app =
      getApps().length === 0
        ? initializeApp({ credential: cert(JSON.parse(credential)) })
        : getApps()[0];

    _adminAuth = getAuth(app);
    _adminDb = getFirestore(app);
    initialized = true;
  } catch (err) {
    console.error('[Firebase Init Error]', err);
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
