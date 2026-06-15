import { Controller, Get } from '@nestjs/common';

import { FakeAuthService } from './fake-auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly fakeAuthService: FakeAuthService) {}

  @Get('me')
  getCurrentUser() {
    return this.fakeAuthService.getCurrentUser();
  }
}
