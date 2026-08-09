import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';

import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { CurrentUserContext } from '../auth/current-user-context';
import {
  ParsePublicKeyPipe,
  type ParsedPublicNumber,
} from '../common/public-identifiers';
import { ContextService } from './context.service';
import { UpdateFeatureContextDto } from './dto/update-feature-context.dto';

@Controller('features/:featureKey/context')
@UseGuards(AuthGuard)
export class ContextController {
  constructor(private readonly contextService: ContextService) {}

  @Get()
  async getFeatureContext(
    @CurrentUser() currentUser: CurrentUserContext,
    @Param('featureKey', new ParsePublicKeyPipe('feature'))
    featurePublicNumber: ParsedPublicNumber,
  ) {
    return this.contextService.getFeatureContext(
      currentUser,
      featurePublicNumber.value,
    );
  }

  @Patch()
  async updateFeatureContext(
    @CurrentUser() currentUser: CurrentUserContext,
    @Param('featureKey', new ParsePublicKeyPipe('feature'))
    featurePublicNumber: ParsedPublicNumber,
    @Body() dto: UpdateFeatureContextDto,
  ) {
    return this.contextService.updateFeatureContext(
      currentUser,
      featurePublicNumber.value,
      dto,
    );
  }
}
