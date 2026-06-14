import { Test, TestingModule } from '@nestjs/testing';

import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController', () => {
  let healthController: HealthController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [HealthService],
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
});
