import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';

/**
 * Lazy-initialize Firebase Admin SDK
 * Only initializes when auth is actually used, preventing build-time errors
 */
function initializeFirebaseAdmin() {
  if (getApps().length) {
    return;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  // Skip initialization if required env vars are missing (e.g., during build)
  if (!projectId || !clientEmail || !privateKey) {
    console.warn('Firebase Admin credentials not configured, skipping initialization');
    return;
  }

  initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
}

/**
 * Get Firebase Auth instance
 * Initializes Firebase Admin on first use
 */
export function getAuth() {
  initializeFirebaseAdmin();
  return getAdminAuth();
}
