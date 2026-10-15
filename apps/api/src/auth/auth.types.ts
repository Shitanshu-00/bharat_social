import type { Request } from 'express';

export interface FirebaseIdentity {
  uid: string;
  phoneNumber?: string;
  email?: string;
  emailVerified: boolean;
  signInProvider?: string;
}

export interface AuthenticatedUser {
  id: string;
  firebaseUid: string | null;
  email: string | null;
  phone: string | null;
  status: 'ACTIVE' | 'SUSPENDED' | 'DELETED';
  profile: {
    username: string;
    displayName: string;
  } | null;
}

export interface AuthenticationContext {
  identity: FirebaseIdentity;
  user: AuthenticatedUser | null;
}

export type AuthenticatedRequest = Request & {
  auth: AuthenticationContext;
};
