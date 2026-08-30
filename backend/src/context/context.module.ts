import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { FeaturesModule } from '../features/features.module';
import { StorageModule } from '../storage/storage.module';
import { ContextFileProcessorService } from './context-file-processor.service';
import { ContextFileCleanupService } from './context-file-cleanup.service';
import { ContextController } from './context.controller';
import { ContextService } from './context.service';

@Module({
  imports: [AuthModule, DatabaseModule, FeaturesModule, StorageModule],
  controllers: [ContextController],
  providers: [
    ContextFileCleanupService,
    ContextFileProcessorService,
    ContextService,
  ],
  exports: [ContextService],
})
export class ContextModule {}
