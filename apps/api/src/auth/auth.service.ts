import { ConflictException, ForbiddenException, Injectable } from '@nestjs/common';

import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { hash, argon2id } from 'argon2';
import { RegisterDto } from './dto/register.dto.js';
import { CompleteProfileDto } from './dto/complete-profile.dto.js';
import type { AuthenticationContext, FirebaseIdentity } from './auth.types.js';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    const username = dto.username.trim().toLowerCase();
    const displayName = dto.displayName.trim();

    if (displayName.length < 2) {
      throw new ConflictException('Display name is too short');
    }

    const passwordHash = await hash(dto.password, {
      type: argon2id,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });

    try {
      const user = await this.prisma.user.create({
        data: {
          email,
          profile: {
            create: {
              username,
              displayName,
            },
          },
          credentials: {
            create: {
              type: 'PASSWORD',
              secretHash: passwordHash,
            },
          },
        },
        select: {
          id: true,
          email: true,
          createdAt: true,
          profile: {
            select: {
              username: true,
              displayName: true,
            },
          },
        },
      });

      return {
        message: 'Account created. Email verification is pending.',
        user,
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Email or username is already registered');
      }

      throw error;
    }
  }

  getSession(auth: AuthenticationContext) {
    return {
      authenticated: true,
      onboardingRequired: !auth.user?.profile,
      user: auth.user,
    };
  }

  async completeProfile(
    auth: AuthenticationContext,
    dto: CompleteProfileDto,
  ) {
    const username = dto.username.trim().toLowerCase();
    const displayName = dto.displayName.trim();

    if (displayName.length < 2) {
      throw new ConflictException('Display name is too short');
    }

    if (auth.user?.profile) {
      return this.profileResult(auth.user);
    }

    const identityData = this.identityData(auth.identity);

    try {
      if (auth.user) {
        const user = await this.prisma.user.update({
          where: { id: auth.user.id },
          data: {
            ...identityData,
            profile: { create: { username, displayName } },
          },
          select: this.userSelection,
        });

        return this.profileResult(user);
      }

      await this.assertIdentityIsNotAlreadyClaimed(auth.identity);

      const user = await this.prisma.user.create({
        data: {
          firebaseUid: auth.identity.uid,
          ...identityData,
          profile: { create: { username, displayName } },
        },
        select: this.userSelection,
      });

      return this.profileResult(user);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'That username or verified identity is already associated with an account',
        );
      }

      throw error;
    }
  }

  private readonly userSelection = {
    id: true,
    firebaseUid: true,
    email: true,
    phone: true,
    status: true,
    profile: {
      select: {
        username: true,
        displayName: true,
      },
    },
  } as const;

  private identityData(identity: FirebaseIdentity) {
    const now = new Date();

    return {
      phone: identity.phoneNumber,
      phoneVerifiedAt: identity.phoneNumber ? now : undefined,
      email: identity.emailVerified ? identity.email : undefined,
      emailVerifiedAt: identity.emailVerified ? now : undefined,
    };
  }

  private async assertIdentityIsNotAlreadyClaimed(identity: FirebaseIdentity) {
    const claimed = await this.prisma.user.findFirst({
      where: {
        OR: [
          ...(identity.phoneNumber ? [{ phone: identity.phoneNumber }] : []),
          ...(identity.emailVerified && identity.email
            ? [{ email: identity.email }]
            : []),
        ],
      },
      select: { id: true },
    });

    if (claimed) {
      throw new ForbiddenException(
        'An existing account uses this identity. Sign in to that account before linking providers',
      );
    }
  }

  private profileResult(user: {
    id: string;
    profile: { username: string; displayName: string } | null;
  }) {
    return {
      onboardingRequired: false,
      user: {
        id: user.id,
        profile: user.profile,
      },
    };
  }
}
