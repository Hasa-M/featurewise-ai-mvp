import { Injectable } from '@nestjs/common';

import { appConfig } from '../config/app.config';

export interface HealthResponse {
  readonly environment: string;
  readonly service: string;
  readonly status: 'ok';
  readonly timestamp: string;
  readonly uptimeSeconds: number;
}

@Injectable()
export class HealthService {
  getHealth(): HealthResponse {
    return {
      environment: appConfig.nodeEnv,
      service: appConfig.serviceName,
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
    };
  }
}
