import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';

import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { CurrentUserContext } from '../auth/current-user-context';
import { ContextService } from './context.service';
import { UpdateFeatureContextDto } from './dto/update-feature-context.dto';

@Controller('features/:featureId/context')
@UseGuards(AuthGuard)
export class ContextController {
  constructor(private readonly contextService: ContextService) {}

  @Get()
  async getFeatureContext(
    @CurrentUser() currentUser: CurrentUserContext,
    @Param('featureId', new ParseUUIDPipe({ version: '4' }))
    featureId: string,
  ) {
    return this.contextService.getFeatureContext(currentUser, featureId);
  }

  @Patch()
  async updateFeatureContext(
    @CurrentUser() currentUser: CurrentUserContext,
    @Param('featureId', new ParseUUIDPipe({ version: '4' }))
    featureId: string,
    @Body() dto: UpdateFeatureContextDto,
  ) {
    return this.contextService.updateFeatureContext(
      currentUser,
      featureId,
      dto,
    );
  }
}
