import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import request from 'supertest';
import type { App } from 'supertest/types';
import type { INestApplication } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHarnessApplication } from '../harness/application';
import {
  loadHarnessEnvironment,
  assertHarnessDatabase,
} from '../harness/environment';
import { seedFixtures } from '../harness/fixtures';
import { actor, exportCapture, inspectFeature } from '../harness/inspection';
import { FixtureRepositoryProvider, fixtureCommit } from '../harness/providers';
import { PrismaService } from '../src/database/prisma.service';
import { AnalysisInputCaptureService } from '../src/analysis/analysis-input-capture.service';
import { ANALYSIS_SETTINGS_VERSION } from '../src/analysis/contracts/analysis-contracts';
import { RepositoryProviderError } from '../src/repository-context';
import { parsePublicKey } from '../src/common/public-identifiers';

jest.setTimeout(60000);
const settings = loadHarnessEnvironment();

describe('Harness: real HTTP, application modules and PostgreSQL', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let token: string;
  let projectKey: string;
  let featureKey: string;
  let otherFeatureKey: string;
  const provider = new FixtureRepositoryProvider();
  const analysisSettings = {
    contractVersion: ANALYSIS_SETTINGS_VERSION,
    parameters: {},
  } as const;
  beforeAll(async () => {
    ({ app } = await createHarnessApplication(provider));
    prisma = app.get(PrismaService);
    const fixtures = await seedFixtures(prisma, settings);
    const fixture = fixtures.find(
      (item) => item.username === 'harness.operator',
    )!;
    projectKey = fixture.projects[0].projectKey;
    featureKey = fixture.projects[0].features[0].featureKey;
    otherFeatureKey = fixtures.find(
      (item) => item.username === 'harness.other',
    )!.projects[0].features[0].featureKey;
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        username: 'harness.operator',
        password: settings.operatorPassword,
      })
      .expect(200);
    token = (login.body as { accessToken: string }).accessToken;
  });
  afterAll(async () => {
    if (app) await app.close();
  });
  const capture = async () =>
    app
      .get(AnalysisInputCaptureService)
      .captureInputSnapshotV2(await actor(app, settings), {
        projectKey,
        featureKey,
        analysisSettings,
      });

  it('rejects unauthenticated, bad-login and cross-organization requests', async () => {
    await request(app.getHttpServer())
      .get(`/features/${featureKey}`)
      .expect(401);
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'harness.operator', password: 'incorrect' })
      .expect(401);
    await request(app.getHttpServer())
      .get(`/features/${otherFeatureKey}`)
      .auth(token, { type: 'bearer' })
      .expect(404);
    await expect(
      inspectFeature(app, settings, otherFeatureKey),
    ).rejects.toThrow();
  });

  it('persists HTTP edits and exports immutable exact-version captures without creating runs', async () => {
    const before = await inspectFeature(app, settings, featureKey);
    const runs = await prisma.analysisRun.count();
    const first = await exportCapture(
      app,
      settings,
      projectKey,
      featureKey,
      true,
    );
    const firstJson = readFileSync(
      join(first.directory, 'input-snapshot.json'),
      'utf8',
    );
    try {
      await request(app.getHttpServer())
        .patch(`/features/${featureKey}`)
        .auth(token, { type: 'bearer' })
        .send({ specificationContent: 'Persist this integration test edit.' })
        .expect(200);
      await request(app.getHttpServer())
        .patch(`/features/${featureKey}/context`)
        .auth(token, { type: 'bearer' })
        .send({ content: 'Changed supporting context.' })
        .expect(200);
      const read = await request(app.getHttpServer())
        .get(`/features/${featureKey}`)
        .auth(token, { type: 'bearer' })
        .expect(200);
      expect(read.body).toMatchObject({
        specificationContent: 'Persist this integration test edit.',
      });
      expect(JSON.stringify(read.body)).not.toMatch(
        /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
      );
      const second = await capture();
      expect(second.feature.specificationContent).toBe(
        'Persist this integration test edit.',
      );
      expect(second.featureContext.content).toBe('Changed supporting context.');
      expect(
        readFileSync(join(first.directory, 'input-snapshot.json'), 'utf8'),
      ).toBe(firstJson);
      expect(first.snapshot.files.map((file) => file.filename).sort()).toEqual([
        'prepared.txt',
        'selected.txt',
      ]);
      expect(
        first.snapshot.files.every(
          (file) => file.original.s3VersionId === 'fixture-v1',
        ),
      ).toBe(true);
      expect(
        first.snapshot.files.find((file) => file.filename === 'prepared.txt')
          ?.prepared?.s3VersionId,
      ).toBe('fixture-v1');
      expect(first.snapshot.repository?.commitSha).toBe(fixtureCommit);
      expect(
        first.snapshot.repository?.files.some(
          (file) =>
            file.path === 'feature.ts' &&
            file.roles.includes('feature_selected'),
        ),
      ).toBe(true);
      expect(await prisma.analysisRun.count()).toBe(runs);
    } finally {
      await request(app.getHttpServer())
        .patch(`/features/${featureKey}`)
        .auth(token, { type: 'bearer' })
        .send({ specificationContent: before.specificationContent })
        .expect(200);
      await request(app.getHttpServer())
        .patch(`/features/${featureKey}/context`)
        .auth(token, { type: 'bearer' })
        .send({ content: before.featureContext })
        .expect(200);
    }
  });

  it('applies file selection through HTTP and rejects unknown request properties', async () => {
    const before = await inspectFeature(app, settings, featureKey);
    const archived = before.files.find(
      (file) => file.filename === 'archived.txt',
    )!;
    await request(app.getHttpServer())
      .patch(`/features/${featureKey}`)
      .auth(token, { type: 'bearer' })
      .send({ arbitrary: true })
      .expect(400);
    try {
      await request(app.getHttpServer())
        .patch(`/storage-objects/${archived.publicKey}/selection`)
        .auth(token, { type: 'bearer' })
        .send({ selected: true })
        .expect(200);
      expect(
        (await capture()).files.some(
          (file) => file.publicKey === archived.publicKey,
        ),
      ).toBe(true);
    } finally {
      await request(app.getHttpServer())
        .patch(`/storage-objects/${archived.publicKey}/selection`)
        .auth(token, { type: 'bearer' })
        .send({ selected: false })
        .expect(200);
    }
  });

  it('detects real repository configuration races and external failures', async () => {
    const project = await prisma.project.findUniqueOrThrow({
      where: { publicNumber: parsePublicKey('project', projectKey) },
    });
    const connection =
      await prisma.projectRepositoryConnection.findUniqueOrThrow({
        where: { projectId: project.id },
      });
    try {
      provider.beforeResolve = async () => {
        provider.beforeResolve = null;
        await prisma.projectRepositoryConnection.update({
          where: { id: connection.id },
          data: { configurationVersion: { increment: 1 } },
        });
      };
      await expect(capture()).rejects.toThrow();
      provider.failure = new RepositoryProviderError(
        'unavailable',
        'Deliberate provider outage',
      );
      await expect(capture()).rejects.toThrow();
    } finally {
      provider.beforeResolve = null;
      provider.failure = null;
      await prisma.projectRepositoryConnection.update({
        where: { id: connection.id },
        data: {
          configurationVersion: connection.configurationVersion,
          status: connection.status,
          lastErrorCode: null,
          lastErrorMessage: null,
        },
      });
    }
  });

  it('rejects a second active run through the PostgreSQL unique constraint', async () => {
    const user = await actor(app, settings);
    const feature = await prisma.feature.findUniqueOrThrow({
      where: { publicNumber: parsePublicKey('feature', featureKey) },
    });
    const snapshot = await capture();
    const data = {
      featureId: feature.id,
      createdById: user.userId,
      status: 'queued' as const,
      analyzerVersion: 'harness-test',
      promptVersion: 'harness-test',
      schemaVersion: 'harness-test',
      analysisSettings,
      inputSnapshot: JSON.parse(
        JSON.stringify(snapshot),
      ) as Prisma.InputJsonValue,
    };
    const outcomes = await Promise.allSettled([
      prisma.analysisRun.create({ data }),
      prisma.analysisRun.create({ data }),
    ]);
    try {
      expect(
        outcomes.filter((item) => item.status === 'fulfilled'),
      ).toHaveLength(1);
      const rejected = outcomes.find((item) => item.status === 'rejected');
      expect(
        rejected?.status === 'rejected' &&
          (rejected.reason as { code: string }).code,
      ).toBe('P2002');
    } finally {
      for (const result of outcomes)
        if (result.status === 'fulfilled')
          await prisma.analysisRun.delete({ where: { id: result.value.id } });
    }
  });

  it('documents actual routes, public keys, request fields and authentication', async () => {
    const response = await request(app.getHttpServer())
      .get('/docs-json')
      .expect(200);
    const doc = response.body as {
      paths: Record<
        string,
        { get?: { security: unknown; parameters: unknown }; patch?: unknown }
      >;
      components: {
        schemas: Record<string, { properties: Record<string, unknown> }>;
      };
    };
    expect(doc.paths['/features/{featureKey}'].get?.security).toEqual([
      { bearer: [] },
    ]);
    expect(
      JSON.stringify(doc.paths['/features/{featureKey}'].get?.parameters),
    ).toContain('FEAT');
    expect(
      doc.components.schemas.CreateFeatureDto.properties.title,
    ).toMatchObject({ type: 'string', maxLength: 180 });
    expect(
      Object.keys(doc.paths).some((path) => path.includes('analysis-runs')),
    ).toBe(false);
    await request(app.getHttpServer()).get('/health/database').expect(200);
  });

  it('connects through OAuth callbacks and rejects a cancelled late callback using real persistence', async () => {
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'harness.other', password: settings.operatorPassword })
      .expect(200);
    const other = login.body as {
      accessToken: string;
      user: { projectKey: string };
    };
    const project = await prisma.project.findUniqueOrThrow({
      where: { publicNumber: parsePublicKey('project', other.user.projectKey) },
    });
    try {
      const cancelled = await request(app.getHttpServer())
        .post(`/projects/${other.user.projectKey}/repository/github/attempts`)
        .auth(other.accessToken, { type: 'bearer' })
        .send({ mode: 'authorize' })
        .expect(201);
      await request(app.getHttpServer())
        .delete(`/projects/${other.user.projectKey}/repository/github/attempts`)
        .auth(other.accessToken, { type: 'bearer' })
        .expect(204);
      const lateUrl = new URL(
        (cancelled.body as { redirectUrl: string }).redirectUrl,
      );
      const late = await request(app.getHttpServer())
        .get(lateUrl.pathname + lateUrl.search)
        .expect(302);
      expect(late.headers.location).toContain(
        'githubError=expired_or_replayed',
      );
      const created = await request(app.getHttpServer())
        .post(`/projects/${other.user.projectKey}/repository/github/attempts`)
        .auth(other.accessToken, { type: 'bearer' })
        .send({ mode: 'authorize' })
        .expect(201);
      const url = new URL(
        (created.body as { redirectUrl: string }).redirectUrl,
      );
      await request(app.getHttpServer())
        .get(url.pathname + url.search)
        .expect(302);
      const available = await request(app.getHttpServer())
        .get(
          `/projects/${other.user.projectKey}/repository/github/available-repositories`,
        )
        .auth(other.accessToken, { type: 'bearer' })
        .expect(200);
      expect(available.body).toMatchObject({
        items: [{ repositoryId: '101' }],
      });
      await request(app.getHttpServer())
        .post(`/projects/${other.user.projectKey}/repository`)
        .auth(other.accessToken, { type: 'bearer' })
        .send({ repositoryId: '101' })
        .expect(201);
      const connected = await request(app.getHttpServer())
        .get(`/projects/${other.user.projectKey}/repository`)
        .auth(other.accessToken, { type: 'bearer' })
        .expect(200);
      expect(connected.body).toMatchObject({
        state: 'connected',
        connection: { fullName: 'harness/fixture' },
      });
    } finally {
      await prisma.projectRepositoryConnection.deleteMany({
        where: { projectId: project.id },
      });
      await prisma.gitHubConnectionAttempt.deleteMany({
        where: { projectId: project.id },
      });
    }
  });

  it('refuses database targets outside the fixed harness identity', () => {
    for (const url of [
      'postgresql://user:secret@127.0.0.1:5433/featurewise',
      'postgresql://featurewise_harness:secret@remote:5434/featurewise_harness',
      'postgresql://featurewise_harness:secret@127.0.0.1:5434/featurewise_harness?schema=other',
    ])
      expect(() => assertHarnessDatabase(url)).toThrow();
  });
});
