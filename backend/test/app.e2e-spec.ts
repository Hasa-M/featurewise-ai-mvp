import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request, { Response } from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(() => {
    process.env.DATABASE_HOST ??= 'localhost';
    process.env.DATABASE_PORT ??= '5433';
    process.env.DATABASE_USER ??= 'featurewise_test_user';
    process.env.DATABASE_PASSWORD ??= 'featurewise_test_password';
    process.env.DATABASE_NAME ??= 'featurewise_test';
    process.env.DATABASE_SSL ??= 'false';
  });

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        $connect: jest.fn(),
        $disconnect: jest.fn(),
        $queryRaw: jest.fn(),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect((response: Response) => {
        const body = response.body as Record<string, unknown>;

        expect(body).toMatchObject({
          environment: 'test',
          service: 'featurewise-backend',
          status: 'ok',
        });
        expect(typeof body.timestamp).toBe('string');
        expect(typeof body.uptimeSeconds).toBe('number');
      });
  });

  afterEach(async () => {
    await app.close();
  });
});
