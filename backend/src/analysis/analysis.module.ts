import { Module } from '@nestjs/common';

import { ContextModule } from '../context/context.module';
import { DatabaseModule } from '../database/database.module';
import { FeaturesModule } from '../features/features.module';
import { WorkspaceModule } from '../workspace/workspace.module';
import { AnalysisInputCaptureService } from './analysis-input-capture.service';

@Module({
  imports: [ContextModule, DatabaseModule, FeaturesModule, WorkspaceModule],
  providers: [AnalysisInputCaptureService],
  exports: [AnalysisInputCaptureService],
})
export class AnalysisModule {}
