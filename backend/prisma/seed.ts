import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { argon2id, hash } from 'argon2';
import { config as loadEnv } from 'dotenv';

import { buildDatabaseUrl } from '../src/config/database-url';

loadEnv();

const SEED_USERNAME = 'dev.operator';
const SEED_ORGANIZATION_NAME = 'Featurewise';
const SEED_PROJECT_NAME = 'Featurewise MVP';

function getSeedPassword(): string {
  const password = process.env.SEED_PASSWORD;

  if (password === undefined || password.trim() === '') {
    throw new Error(
      'SEED_PASSWORD is required to seed the development database',
    );
  }

  return password;
}

const adapter = new PrismaPg(buildDatabaseUrl(), { schema: 'public' });
const prisma = new PrismaClient({ adapter });

async function main(): Promise<void> {
  const passwordHash = await hash(getSeedPassword(), { type: argon2id });
  const existingUser = await prisma.user.findUnique({
    where: { username: SEED_USERNAME },
    select: { organizationId: true },
  });

  if (existingUser === null) {
    await prisma.organization.create({
      data: {
        name: SEED_ORGANIZATION_NAME,
        projects: {
          create: {
            context: {
              create: {},
            },
            name: SEED_PROJECT_NAME,
          },
        },
        users: {
          create: {
            username: SEED_USERNAME,
            passwordHash,
          },
        },
      },
    });
  } else {
    await prisma.$transaction([
      prisma.user.update({
        where: { username: SEED_USERNAME },
        data: {
          isActive: true,
          passwordHash,
        },
      }),
      prisma.project.upsert({
        where: { organizationId: existingUser.organizationId },
        create: {
          context: {
            create: {},
          },
          organizationId: existingUser.organizationId,
          name: SEED_PROJECT_NAME,
        },
        update: {
          context: {
            upsert: {
              create: {},
              update: {},
            },
          },
        },
      }),
    ]);
  }

  console.log(`Seeded development operator: ${SEED_USERNAME}`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
