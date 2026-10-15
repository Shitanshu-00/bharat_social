import { ConflictException, ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { Prisma } from '../generated/prisma/client.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { AuthService } from './auth.service.js';
import type { AuthenticationContext } from './auth.types.js';

const phoneIdentity = {
  uid: 'firebase-phone-user',
  phoneNumber: '+919876543210',
  emailVerified: false,
  signInProvider: 'phone',
};

function setup() {
  const userCreate = vi.fn();
  const userUpdate = vi.fn();
  const userFindFirst = vi.fn().mockResolvedValue(null);
  const prisma = {
    user: {
      create: userCreate,
      update: userUpdate,
      findFirst: userFindFirst,
    },
  } as unknown as PrismaService;

  return {
    prisma,
    service: new AuthService(prisma),
    userCreate,
    userFindFirst,
  };
}

describe('AuthService Firebase onboarding', () => {
  it('reports onboarding for a verified identity without a local user', () => {
    const { service } = setup();
    expect(
      service.getSession({ identity: phoneIdentity, user: null }),
    ).toMatchObject({ authenticated: true, onboardingRequired: true });
  });

  it('returns an existing profile without creating another user', async () => {
    const { service, userCreate } = setup();
    const auth = {
      identity: phoneIdentity,
      user: {
        id: 'user-1',
        firebaseUid: phoneIdentity.uid,
        email: null,
        phone: phoneIdentity.phoneNumber,
        status: 'ACTIVE',
        profile: { username: 'bharatiya', displayName: 'Bharat User' },
      },
    } satisfies AuthenticationContext;

    await expect(
      service.completeProfile(auth, {
        username: 'ignored',
        displayName: 'Ignored',
      }),
    ).resolves.toMatchObject({ user: { id: 'user-1' } });
    expect(userCreate).not.toHaveBeenCalled();
  });

  it('creates a new user and profile in one Prisma operation', async () => {
    const { service, userCreate } = setup();
    userCreate.mockResolvedValue({
      id: 'user-2',
      firebaseUid: phoneIdentity.uid,
      email: null,
      phone: phoneIdentity.phoneNumber,
      status: 'ACTIVE',
      profile: { username: 'new_user', displayName: 'New User' },
    } as never);

    await expect(
      service.completeProfile(
        { identity: phoneIdentity, user: null },
        { username: 'New_User', displayName: ' New User ' },
      ),
    ).resolves.toMatchObject({
      onboardingRequired: false,
      user: { profile: { username: 'new_user' } },
    });

    expect(userCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          firebaseUid: phoneIdentity.uid,
          phone: phoneIdentity.phoneNumber,
          profile: {
            create: { username: 'new_user', displayName: 'New User' },
          },
        }),
      }),
    );
  });

  it('does not silently merge an existing phone or email account', async () => {
    const { service, userCreate, userFindFirst } = setup();
    userFindFirst.mockResolvedValue({ id: 'existing' });

    await expect(
      service.completeProfile(
        { identity: phoneIdentity, user: null },
        { username: 'new_user', displayName: 'New User' },
      ),
    ).rejects.toThrow(ForbiddenException);
    expect(userCreate).not.toHaveBeenCalled();
  });

  it('surfaces username uniqueness conflicts without duplicating identity', async () => {
    const { service, userCreate } = setup();
    const conflict = new Prisma.PrismaClientKnownRequestError('unique', {
      code: 'P2002',
      clientVersion: '7.10.0',
      meta: { modelName: 'User' },
    });
    userCreate.mockRejectedValue(conflict);

    await expect(
      service.completeProfile(
        { identity: phoneIdentity, user: null },
        { username: 'taken', displayName: 'New User' },
      ),
    ).rejects.toThrow(ConflictException);
    expect(userCreate).toHaveBeenCalledTimes(1);
  });
});
