import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { FeatureUpdatesService } from './feature-updates.service';

@Module({
  imports: [DatabaseModule],
  providers: [FeatureUpdatesService],
  exports: [FeatureUpdatesService],
})
export class FeatureUpdatesModule {}
