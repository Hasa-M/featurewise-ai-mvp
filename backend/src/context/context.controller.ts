import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
} from '@nestjs/common';

import { FakeAuthService } from '../auth/fake-auth.service';
import { ContextService } from './context.service';
import { UpdateFeatureContextDto } from './dto/update-feature-context.dto';

@Controller('features/:featureId/context')
export class ContextController {
  constructor(
    private readonly contextService: ContextService,
    private readonly fakeAuthService: FakeAuthService,
  ) {}

  @Get()
  async getFeatureContext(
    @Param('featureId', new ParseUUIDPipe({ version: '4' }))
    featureId: string,
  ) {
    return this.contextService.getFeatureContext(
      await this.fakeAuthService.getCurrentUser(),
      featureId,
    );
  }

  @Patch()
  async updateFeatureContext(
    @Param('featureId', new ParseUUIDPipe({ version: '4' }))
    featureId: string,
    @Body() dto: UpdateFeatureContextDto,
  ) {
    return this.contextService.updateFeatureContext(
      await this.fakeAuthService.getCurrentUser(),
      featureId,
      dto,
    );
  }
}
