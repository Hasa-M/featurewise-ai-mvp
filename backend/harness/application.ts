import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { configureApplication } from '../src/configure-application';
import { setupOpenApi } from '../src/openapi';
import { REPOSITORY_PROVIDER_PORT } from '../src/repository-context';
import { StorageService } from '../src/storage/storage.service';
import { ContextFileCleanupService } from '../src/context/context-file-cleanup.service';
import { FixtureRepositoryProvider, FixtureStorageService } from './providers';
import { assertHarnessDatabase, assertHarnessMode } from './environment';

export async function createHarnessApplication(
  provider = new FixtureRepositoryProvider(),
) {
  assertHarnessDatabase(process.env.DATABASE_URL ?? '');
  assertHarnessMode();
  const builder = Test.createTestingModule({ imports: [AppModule] });
  // A test composition root, never imported by the production bootstrap.
  if (process.env.HARNESS_MODE !== 'live') {
    builder.overrideProvider(REPOSITORY_PROVIDER_PORT).useValue(provider);
    builder.overrideProvider(StorageService).useClass(FixtureStorageService);
  }
  // Explicit tests own cleanup timing; interactive fixtures must not disappear in the background.
  builder
    .overrideProvider(ContextFileCleanupService)
    .useValue({ sweep: () => Promise.resolve() });
  const module = await builder.compile();
  const app = module.createNestApplication({ logger: ['error', 'warn'] });
  configureApplication(app);
  const document = setupOpenApi(app);
  await app.init();
  return { app, document, provider };
}
