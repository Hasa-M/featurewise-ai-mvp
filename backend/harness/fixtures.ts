import { argon2id, hash } from 'argon2';
import type { PrismaClient } from '@prisma/client';
import { formatPublicKey } from '../src/common/public-identifiers';
import { fileBytes, fileChecksum, fixtureRepository } from './providers';
import type { HarnessSettings } from './environment';

export async function seedFixtures(
  prisma: PrismaClient,
  settings: HarnessSettings,
) {
  const passwordHash = await hash(settings.operatorPassword, {
    type: argon2id,
  });
  for (const username of ['harness.operator', 'harness.other']) {
    await prisma.$transaction(async (transaction) => {
      const prisma = transaction;
      const existing = await prisma.user.findUnique({ where: { username } });
      if (existing) return; // Preserve interactive edits; reset explicitly to restore defaults.
      const organization = await prisma.organization.create({
        data: {
          name:
            username === 'harness.operator'
              ? 'Harness workspace'
              : 'Other harness organization',
        },
      });
      const user = await prisma.user.create({
        data: { username, passwordHash, organizationId: organization.id },
      });
      const project = await prisma.project.create({
        data: {
          organizationId: organization.id,
          name: 'Harness project',
          context: {
            create: {
              content: 'All feature specifications must persist after reload.',
            },
          },
        },
      });
      const feature = await prisma.feature.create({
        data: {
          projectId: project.id,
          createdById: user.id,
          title: 'Persist feature specification',
          specificationContent:
            'An operator can edit a specification and see it unchanged after reloading.',
          contextArtifact: {
            create: { content: 'Support plain text and preserve user intent.' },
          },
        },
        include: { contextArtifact: true },
      });
      if (
        username !== 'harness.operator' ||
        process.env.HARNESS_MODE === 'live'
      )
        return;
      for (const [name, status, selected, prepared] of [
        ['selected', 'ready', true, false],
        ['prepared', 'ready', true, true],
        ['archived', 'ready', false, false],
        ['pending', 'pending_upload', true, false],
        ['failed', 'failed', false, false],
      ] as const) {
        await prisma.storageObject.create({
          data: {
            contextArtifactId: feature.contextArtifact!.id,
            createdById: user.id,
            status,
            selected,
            uploadKey: `harness/fixtures/${name}/upload`,
            s3Key: `harness/fixtures/${name}/original`,
            s3VersionId: status === 'ready' ? 'fixture-v1' : null,
            assetType: 'file',
            mimeType: 'text/plain',
            sizeBytes: fileBytes.length,
            originalFilename: `${name}.txt`,
            checksumSha256: fileChecksum,
            preparationVersion: status === 'ready' ? 'fixture-v1' : null,
            uploadExpiresAt: new Date('2099-01-01'),
            readyAt: status === 'ready' ? new Date() : null,
            ...(status === 'failed'
              ? {
                  failedAt: new Date(),
                  failureCode: 'FIXTURE_FAILURE',
                  failureMessage: 'Deliberate failed fixture',
                }
              : {}),
            ...(prepared
              ? {
                  preparedS3Key: `harness/fixtures/${name}/prepared`,
                  preparedS3VersionId: 'fixture-v1',
                  preparedMimeType: 'text/plain',
                  preparedSizeBytes: fileBytes.length,
                  preparedChecksumSha256: fileChecksum,
                }
              : {}),
          },
        });
      }
      const connection = await prisma.projectRepositoryConnection.create({
        data: {
          projectId: project.id,
          installationId: 100n,
          ...fixtureRepository,
          repositoryId: BigInt(fixtureRepository.repositoryId),
          baseBranch: 'main',
        },
      });
      await prisma.featureRepositoryContext.create({
        data: {
          featureId: feature.id,
          projectId: project.id,
          connectionId: connection.id,
          selectedFiles: { create: { path: 'feature.ts' } },
        },
      });
    });
  }
  const users = await prisma.user.findMany({
    where: { username: { in: ['harness.operator', 'harness.other'] } },
    include: {
      organization: { include: { projects: { include: { features: true } } } },
    },
  });
  return users.map((user) => ({
    username: user.username,
    userKey: formatPublicKey('user', user.publicNumber),
    organizationKey: formatPublicKey(
      'organization',
      user.organization.publicNumber,
    ),
    projects: user.organization.projects.map((project) => ({
      projectKey: formatPublicKey('project', project.publicNumber),
      features: project.features.map((feature) => ({
        featureKey: formatPublicKey('feature', feature.publicNumber),
        title: feature.title,
      })),
    })),
  }));
}
