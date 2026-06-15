import { Controller, Get } from '@nestjs/common';

import { DatabaseHealthService } from './database-health.service';
import type { DatabaseHealthResponse } from './database-health.service';
import { HealthService } from './health.service';
import type { HealthResponse } from './health.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly databaseHealthService: DatabaseHealthService,
    private readonly healthService: HealthService,
  ) {}

  @Get()
  getHealth(): HealthResponse {
    return this.healthService.getHealth();
  }

  @Get('database')
  getDatabaseHealth(): Promise<DatabaseHealthResponse> {
    return this.databaseHealthService.getHealth();
  }
}
