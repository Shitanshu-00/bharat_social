import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

import type { AuthenticatedRequest } from './auth.types.js';

/** Apply after FirebaseAuthGuard on routes that require completed onboarding. */
@Injectable()
export class RegisteredUserGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest>();

    if (!request.auth?.user?.profile) {
      throw new ForbiddenException('Complete your profile to continue');
    }

    return true;
  }
}
