import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { AuthController } from './auth.controller';
import { FakeAuthService } from './fake-auth.service';

@Module({
  imports: [DatabaseModule],
  controllers: [AuthController],
  providers: [FakeAuthService],
  exports: [FakeAuthService],
})
export class AuthModule {}
