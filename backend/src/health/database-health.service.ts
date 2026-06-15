import { Injectable, ServiceUnavailableException } from '@nestjs/common';

import { PrismaService } from '../database/prisma.service';

export interface DatabaseHealthResponse {
  readonly database: 'postgres';
  readonly responseTimeMs: number;
  readonly status: 'ok';
  readonly timestamp: string;
}

@Injectable()
export class DatabaseHealthService {
  constructor(private readonly prismaService: PrismaService) {}

  async getHealth(): Promise<DatabaseHealthResponse> {
    const startedAt = Date.now();

    try {
      await this.prismaService.$queryRaw`SELECT 1`;
    } catch (error: unknown) {
      throw new ServiceUnavailableException({
        database: 'postgres',
        message:
          error instanceof Error ? error.message : 'Database unavailable',
        status: 'unavailable',
        timestamp: new Date().toISOString(),
      });
    }

    return {
      database: 'postgres',
      responseTimeMs: Date.now() - startedAt,
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
