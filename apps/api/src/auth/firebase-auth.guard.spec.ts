import {
  ForbiddenException,
  UnauthorizedException,
  type ExecutionContext,
} from '@nestjs/common';
import type { Request } from 'express';
import { describe, expect, it, vi } from 'vitest';

import type { FirebaseService } from '../firebase/firebase.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { AuthenticatedRequest } from './auth.types.js';
import { FirebaseAuthGuard } from './firebase-auth.guard.js';

function contextFor(request: Partial<Request>) {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as ExecutionContext;
}

function setup(token: Record<string, unknown>, user: unknown = null) {
  const firebase = {
    verifyIdToken: vi.fn().mockResolvedValue(token),
  } as unknown as FirebaseService;
  const prisma = {
    user: { findUnique: vi.fn().mockResolvedValue(user) },
  } as unknown as PrismaService;

  return { guard: new FirebaseAuthGuard(firebase, prisma), firebase, prisma };
}

describe('FirebaseAuthGuard', () => {
  it('rejects a request without a bearer token', async () => {
    const { guard } = setup({});
    await expect(guard.canActivate(contextFor({ headers: {} }))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects an invalid or revoked ID token', async () => {
    const firebase = {
      verifyIdToken: vi.fn().mockRejectedValue(new Error('revoked')),
    } as unknown as FirebaseService;
    const prisma = {} as PrismaService;
    const guard = new FirebaseAuthGuard(firebase, prisma);

    await expect(
      guard.canActivate(
        contextFor({ headers: { authorization: 'Bearer invalid-token' } }),
      ),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('allows a phone-authenticated identity to begin onboarding', async () => {
    const request = {
      headers: { authorization: 'Bearer valid-token' },
    } as Partial<Request>;
    const { guard } = setup({
      uid: 'firebase-1',
      phone_number: '+919876543210',
      firebase: { sign_in_provider: 'phone' },
    });

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect((request as AuthenticatedRequest).auth.identity.phoneNumber).toBe(
      '+919876543210',
    );
    expect((request as AuthenticatedRequest).auth.user).toBeNull();
  });

  it('rejects an unverified email-only identity', async () => {
    const { guard } = setup({
      uid: 'firebase-2',
      email: 'person@example.com',
      email_verified: false,
    });

    await expect(
      guard.canActivate(
        contextFor({ headers: { authorization: 'Bearer token' } }),
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects a suspended local account', async () => {
    const { guard } = setup(
      { uid: 'firebase-3', phone_number: '+919876543210' },
      {
        id: 'user-1',
        firebaseUid: 'firebase-3',
        email: null,
        phone: '+919876543210',
        status: 'SUSPENDED',
        profile: null,
      },
    );

    await expect(
      guard.canActivate(
        contextFor({ headers: { authorization: 'Bearer token' } }),
      ),
    ).rejects.toThrow(ForbiddenException);
  });
});
