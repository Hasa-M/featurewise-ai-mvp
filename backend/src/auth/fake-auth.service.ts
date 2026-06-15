import {
  Injectable,
  OnApplicationBootstrap,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PrismaService } from '../database/prisma.service';
import type { CurrentUserContext } from './current-user-context';

const DEV_USERNAME = 'dev.operator';
const DEV_ORGANIZATION_NAME = 'Featurewise Dev Organization';
const DEV_PROJECT_NAME = 'Featurewise MVP Project';
const PLACEHOLDER_ARGON2ID_HASH =
  '$argon2id$v=19$m=65536,t=3,p=4$cGxhY2Vob2xkZXI$placeholderhashnotused';

interface FakeUserWithWorkspace {
  readonly id: string;
  readonly username: string;
  readonly organizationId: string;
  readonly organization: {
    readonly projects: ReadonlyArray<{
      readonly id: string;
    }>;
  };
}

@Injectable()
export class FakeAuthService implements OnApplicationBootstrap {
  constructor(
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (this.configService.get<string>('app.nodeEnv') === 'production') {
      return;
    }

    await this.ensureFakeWorkspace();
  }

  async getCurrentUser(): Promise<CurrentUserContext> {
    const user = await this.getFakeUserWithWorkspace();

    if (user !== null) {
      return this.toCurrentUserContext(user);
    }

    return this.toCurrentUserContext(await this.ensureFakeWorkspace());
  }

  private async ensureFakeWorkspace(): Promise<FakeUserWithWorkspace> {
    return this.prismaService.$transaction(async (transaction) => {
      const existingUser = await transaction.user.findUnique({
        where: { username: DEV_USERNAME },
        include: {
          organization: {
            include: {
              projects: {
                orderBy: { createdAt: 'asc' },
                take: 1,
              },
            },
          },
        },
      });

      if (existingUser !== null) {
        if (existingUser.organization.projects.length > 0) {
          return existingUser;
        }

        const project = await transaction.project.create({
          data: {
            name: DEV_PROJECT_NAME,
            organizationId: existingUser.organizationId,
          },
        });

        return {
          ...existingUser,
          organization: {
            projects: [{ id: project.id }],
          },
        };
      }

      const organization = await transaction.organization.create({
        data: {
          name: DEV_ORGANIZATION_NAME,
        },
      });
      const user = await transaction.user.create({
        data: {
          organizationId: organization.id,
          passwordHash: PLACEHOLDER_ARGON2ID_HASH,
          username: DEV_USERNAME,
        },
      });
      const project = await transaction.project.create({
        data: {
          name: DEV_PROJECT_NAME,
          organizationId: organization.id,
        },
      });

      return {
        id: user.id,
        organizationId: organization.id,
        username: user.username,
        organization: {
          projects: [{ id: project.id }],
        },
      };
    });
  }

  private async getFakeUserWithWorkspace(): Promise<FakeUserWithWorkspace | null> {
    return this.prismaService.user.findUnique({
      where: {
        username: DEV_USERNAME,
      },
      include: {
        organization: {
          include: {
            projects: {
              orderBy: { createdAt: 'asc' },
              take: 1,
            },
          },
        },
      },
    });
  }

  private toCurrentUserContext(
    user: FakeUserWithWorkspace,
  ): CurrentUserContext {
    const project = user.organization.projects[0];

    if (project === undefined) {
      throw new ServiceUnavailableException(
        'Temporary workspace project is not available',
      );
    }

    return {
      organizationId: user.organizationId,
      projectId: project.id,
      userId: user.id,
      username: user.username,
    };
  }
}
