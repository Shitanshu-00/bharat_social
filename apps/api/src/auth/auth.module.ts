import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { FirebaseModule } from '../firebase/firebase.module.js';
import { FirebaseAuthGuard } from './firebase-auth.guard.js';
import { RegisteredUserGuard } from './registered-user.guard.js';

@Module({
  imports: [PrismaModule, FirebaseModule],
  controllers: [AuthController],
  providers: [AuthService, FirebaseAuthGuard, RegisteredUserGuard],
  exports: [AuthService, FirebaseAuthGuard, RegisteredUserGuard],
})
export class AuthModule {}
