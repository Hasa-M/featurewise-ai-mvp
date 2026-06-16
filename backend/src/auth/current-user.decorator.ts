import {
  createParamDecorator,
  ExecutionContext,
  InternalServerErrorException,
} from '@nestjs/common';

import type { AuthenticatedRequest } from './authenticated-request';
import type { CurrentUserContext } from './current-user-context';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): CurrentUserContext => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (request.currentUser === undefined) {
      throw new InternalServerErrorException(
        'Current user was not attached to the request',
      );
    }

    return request.currentUser;
  },
);
