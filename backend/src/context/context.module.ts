import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { FeaturesModule } from '../features/features.module';
import { ContextController } from './context.controller';
import { ContextService } from './context.service';

@Module({
  imports: [AuthModule, DatabaseModule, FeaturesModule],
  controllers: [ContextController],
  providers: [ContextService],
  exports: [ContextService],
})
export class ContextModule {}
