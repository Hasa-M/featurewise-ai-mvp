import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';

import { DatabaseHealthService } from './database-health.service';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import type { DatabaseHealthResponse } from './database-health.service';

const databaseHealth: DatabaseHealthResponse = {
  database: 'postgres',
  responseTimeMs: 1,
  status: 'ok',
  timestamp: '2026-06-15T00:00:00.000Z',
};

describe('HealthController', () => {
  let healthController: HealthController;
  let getDatabaseHealth: jest.MockedFunction<
    DatabaseHealthService['getHealth']
  >;

  beforeEach(async () => {
    getDatabaseHealth = jest.fn().mockResolvedValue(databaseHealth);

    const app: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        HealthService,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn((key: string) => {
              const values: Record<string, string> = {
                'app.nodeEnv': 'test',
                'app.serviceName': 'featurewise-backend',
              };

              return values[key];
            }),
          },
        },
        {
          provide: DatabaseHealthService,
          useValue: {
            getHealth: getDatabaseHealth,
          },
        },
      ],
    }).compile();

    healthController = app.get<HealthController>(HealthController);
  });

  it('returns backend health metadata', () => {
    expect(healthController.getHealth()).toMatchObject({
      environment: 'test',
      service: 'featurewise-backend',
      status: 'ok',
    });
  });

  it('returns database health metadata', async () => {
    await expect(healthController.getDatabaseHealth()).resolves.toEqual(
      databaseHealth,
    );
    expect(getDatabaseHealth).toHaveBeenCalledTimes(1);
  });
});
