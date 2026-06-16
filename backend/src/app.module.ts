import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuthModule } from './auth/auth.module';
import { appConfig } from './config/app.config';
import { authConfig } from './config/auth.config';
import { databaseConfig } from './config/database.config';
import { ContextModule } from './context/context.module';
import { DatabaseModule } from './database/database.module';
import { FeaturesModule } from './features/features.module';
import { HealthModule } from './health/health.module';
import { WorkspaceModule } from './workspace/workspace.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      expandVariables: true,
      isGlobal: true,
      load: [appConfig, authConfig, databaseConfig],
    }),
    AuthModule,
    ContextModule,
    DatabaseModule,
    FeaturesModule,
    HealthModule,
    WorkspaceModule,
  ],
})
export class AppModule {}
