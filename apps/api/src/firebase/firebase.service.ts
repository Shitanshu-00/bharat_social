import { Injectable } from '@nestjs/common';
import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
  type App,
} from 'firebase-admin/app';
import {
  getAuth,
  type Auth,
  type DecodedIdToken,
} from 'firebase-admin/auth';

function createFirebaseApp(): App {
  const existingApp = getApps()[0];

  if (existingApp) {
    return existingApp;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;

  if (!projectId) {
    throw new Error('FIREBASE_PROJECT_ID is not configured');
  }

  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const credential =
    clientEmail && privateKey
      ? cert({ projectId, clientEmail, privateKey })
      : applicationDefault();

  return initializeApp({ credential, projectId });
}

@Injectable()
export class FirebaseService {
  private readonly auth: Auth;

  constructor() {
    this.auth = getAuth(createFirebaseApp());
  }

  verifyIdToken(idToken: string): Promise<DecodedIdToken> {
    return this.auth.verifyIdToken(idToken, true);
  }
}
