import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';

import { AppModule } from './app.module';
import { configureApplication } from './configure-application';
import { setupOpenApi } from './openapi';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  configureApplication(app);
  if (
    process.env.SWAGGER_ENABLED === 'true' &&
    process.env.NODE_ENV !== 'production'
  )
    setupOpenApi(app);

  await app.listen(configService.getOrThrow<number>('app.port'));
}
void bootstrap();
