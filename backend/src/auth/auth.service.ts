import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { verify } from 'argon2';

import { PrismaService } from '../database/prisma.service';
import type { LoginRequestDto } from './dto/login-request.dto';
import type { CurrentUserContext } from './current-user-context';

interface UserWithWorkspace {
  readonly id: string;
  readonly username: string;
  readonly organizationId: string;
  readonly passwordHash: string;
  readonly isActive: boolean;
  readonly organization: {
    readonly projects: ReadonlyArray<{
      readonly id: string;
    }>;
  };
}

interface AuthTokenPayload extends Record<string, unknown> {
  readonly sub: string;
}

export interface LoginResponse {
  readonly accessToken: string;
  readonly expiresInSeconds: number;
  readonly tokenType: 'Bearer';
  readonly user: CurrentUserContext;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly prismaService: PrismaService,
  ) {}

  async login(dto: LoginRequestDto): Promise<LoginResponse> {
    const user = await this.findUserWithWorkspaceByUsername(
      dto.username.trim(),
    );

    if (
      user === null ||
      !user.isActive ||
      !(await this.passwordMatches(user.passwordHash, dto.password))
    ) {
      throw new UnauthorizedException('Invalid username or password');
    }

    const expiresInSeconds = this.configService.getOrThrow<number>(
      'auth.accessTokenTtlSeconds',
    );
    const currentUser = this.toCurrentUserContext(user);
    const accessToken = await this.jwtService.signAsync(
      {
        sub: user.id,
      } satisfies AuthTokenPayload,
      {
        expiresIn: expiresInSeconds,
        secret: this.configService.getOrThrow<string>('auth.tokenSecret'),
      },
    );

    return {
      accessToken,
      expiresInSeconds,
      tokenType: 'Bearer',
      user: currentUser,
    };
  }

  async authenticateToken(token: string): Promise<CurrentUserContext> {
    const payload = await this.verifyToken(token);

    const user = await this.findUserWithWorkspaceById(payload.sub);

    if (user === null || !user.isActive) {
      throw new UnauthorizedException('Invalid authentication token');
    }

    return this.toCurrentUserContext(user);
  }

  private async verifyToken(token: string): Promise<AuthTokenPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<
        Record<string, unknown>
      >(token, {
        secret: this.configService.getOrThrow<string>('auth.tokenSecret'),
      });

      if (!this.isAuthTokenPayload(payload)) {
        throw new UnauthorizedException('Invalid authentication token');
      }

      return payload;
    } catch (error: unknown) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('Invalid authentication token');
    }
  }

  private isAuthTokenPayload(
    payload: Record<string, unknown>,
  ): payload is AuthTokenPayload {
    return typeof payload.sub === 'string' && payload.sub.trim() !== '';
  }

  private async passwordMatches(
    passwordHash: string,
    password: string,
  ): Promise<boolean> {
    try {
      return await verify(passwordHash, password);
    } catch {
      return false;
    }
  }

  private findUserWithWorkspaceByUsername(
    username: string,
  ): Promise<UserWithWorkspace | null> {
    return this.prismaService.user.findUnique({
      where: {
        username,
      },
      include: this.userWorkspaceInclude(),
    });
  }

  private findUserWithWorkspaceById(
    id: string,
  ): Promise<UserWithWorkspace | null> {
    return this.prismaService.user.findUnique({
      where: {
        id,
      },
      include: this.userWorkspaceInclude(),
    });
  }

  private userWorkspaceInclude() {
    return {
      organization: {
        include: {
          projects: {
            orderBy: { createdAt: 'asc' },
            take: 1,
          },
        },
      },
    } as const;
  }

  private toCurrentUserContext(user: UserWithWorkspace): CurrentUserContext {
    const project = user.organization.projects[0];

    if (project === undefined) {
      throw new ServiceUnavailableException(
        'Authenticated workspace project is not available',
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
