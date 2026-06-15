import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface HealthResponse {
  readonly environment: string;
  readonly service: string;
  readonly status: 'ok';
  readonly timestamp: string;
  readonly uptimeSeconds: number;
}

@Injectable()
export class HealthService {
  constructor(private readonly configService: ConfigService) {}

  getHealth(): HealthResponse {
    return {
      environment: this.configService.getOrThrow<string>('app.nodeEnv'),
      service: this.configService.getOrThrow<string>('app.serviceName'),
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
    };
  }
}
