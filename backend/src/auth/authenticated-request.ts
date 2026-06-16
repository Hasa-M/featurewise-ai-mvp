import type { Request } from 'express';

import type { CurrentUserContext } from './current-user-context';

export interface AuthenticatedRequest extends Request {
  currentUser?: CurrentUserContext;
}
