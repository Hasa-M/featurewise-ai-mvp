import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { DatabaseHealthService } from './database-health.service';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

@Module({
  imports: [DatabaseModule],
  controllers: [HealthController],
  providers: [DatabaseHealthService, HealthService],
})
export class HealthModule {}
