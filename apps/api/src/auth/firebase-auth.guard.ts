import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';

import { FirebaseService } from '../firebase/firebase.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  AuthenticatedRequest,
  FirebaseIdentity,
} from './auth.types.js';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(
    private readonly firebase: FirebaseService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authorization = request.headers.authorization;
    const match = authorization?.match(/^Bearer ([^\s]+)$/);

    if (!match) {
      throw new UnauthorizedException('A valid bearer token is required');
    }

    const token = await this.firebase.verifyIdToken(match[1]).catch(() => {
      throw new UnauthorizedException('The authentication token is invalid');
    });
    const identity: FirebaseIdentity = {
      uid: token.uid,
      phoneNumber: token.phone_number,
      email: token.email?.trim().toLowerCase(),
      emailVerified: token.email_verified === true,
      signInProvider: token.firebase?.sign_in_provider,
    };

    if (!identity.phoneNumber && identity.email && !identity.emailVerified) {
      throw new ForbiddenException(
        'Verify your email before accessing BharatSocial',
      );
    }

    if (!identity.phoneNumber && !(identity.email && identity.emailVerified)) {
      throw new ForbiddenException(
        'A verified phone number or email address is required',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { firebaseUid: identity.uid },
      select: {
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
      },
    });

    if (user && user.status !== 'ACTIVE') {
      throw new ForbiddenException('This account is not active');
    }

    (request as AuthenticatedRequest).auth = { identity, user };
    return true;
  }
}
