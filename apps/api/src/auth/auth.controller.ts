import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

import { AuthService } from './auth.service.js';
import type { AuthenticatedRequest } from './auth.types.js';
import { CompleteProfileDto } from './dto/complete-profile.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { FirebaseAuthGuard } from './firebase-auth.guard.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    if (
      process.env.NODE_ENV === 'production' ||
      process.env.ALLOW_DEV_REGISTRATION !== 'true'
    ) {
      throw new ForbiddenException('Registration is not enabled');
    }

    return this.authService.register(dto);
  }

  @Get('me')
  @UseGuards(FirebaseAuthGuard)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  getSession(@Req() request: AuthenticatedRequest) {
    return this.authService.getSession(request.auth);
  }

  @Post('complete-profile')
  @UseGuards(FirebaseAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  completeProfile(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CompleteProfileDto,
  ) {
    return this.authService.completeProfile(request.auth, dto);
  }
}
