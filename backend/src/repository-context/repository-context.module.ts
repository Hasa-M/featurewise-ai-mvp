import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { GitHubRepositoryAdapter } from './github/github-repository.adapter';
import { REPOSITORY_PROVIDER_PORT } from './ports/repository-provider.port';
import { RepositoryContextController } from './repository-context.controller';
import { RepositoryContextService } from './repository-context.service';
import { RepositoryReaderService } from './repository-reader.service';

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [RepositoryContextController],
  providers: [
    GitHubRepositoryAdapter,
    RepositoryContextService,
    RepositoryReaderService,
    { provide: REPOSITORY_PROVIDER_PORT, useExisting: GitHubRepositoryAdapter },
  ],
  exports: [
    RepositoryContextService,
    RepositoryReaderService,
    REPOSITORY_PROVIDER_PORT,
  ],
})
export class RepositoryContextModule {}
