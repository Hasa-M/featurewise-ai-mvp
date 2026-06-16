import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { AuthService } from './auth.service';
import type { AuthenticatedRequest } from './authenticated-request';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractBearerToken(request.headers.authorization);

    if (token === null) {
      throw new UnauthorizedException('Bearer token is required');
    }

    request.currentUser = await this.authService.authenticateToken(token);

    return true;
  }

  private extractBearerToken(
    authorizationHeader: string | string[] | undefined,
  ): string | null {
    if (typeof authorizationHeader !== 'string') {
      return null;
    }

    const [scheme, token, extraPart] = authorizationHeader.split(' ');

    if (
      scheme?.toLowerCase() !== 'bearer' ||
      token === undefined ||
      token.trim() === '' ||
      extraPart !== undefined
    ) {
      return null;
    }

    return token;
  }
}
