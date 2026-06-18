import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { CurrentUserContext } from '../auth/current-user-context';
import { CreateFeatureDto } from './dto/create-feature.dto';
import { UpdateFeatureDto } from './dto/update-feature.dto';
import { FeaturesService } from './features.service';

@Controller()
@UseGuards(AuthGuard)
export class FeaturesController {
  constructor(private readonly featuresService: FeaturesService) {}

  @Get('projects/:projectId/features')
  async listFeatures(
    @CurrentUser() currentUser: CurrentUserContext,
    @Param('projectId', new ParseUUIDPipe({ version: '4' }))
    projectId: string,
  ) {
    return this.featuresService.listFeatures(currentUser, projectId);
  }

  @Post('projects/:projectId/features')
  async createFeature(
    @CurrentUser() currentUser: CurrentUserContext,
    @Param('projectId', new ParseUUIDPipe({ version: '4' }))
    projectId: string,
    @Body() dto: CreateFeatureDto,
  ) {
    return this.featuresService.createFeature(currentUser, projectId, dto);
  }

  @Get('features/:featureId')
  async getFeature(
    @CurrentUser() currentUser: CurrentUserContext,
    @Param('featureId', new ParseUUIDPipe({ version: '4' }))
    featureId: string,
  ) {
    return this.featuresService.getFeature(currentUser, featureId);
  }

  @Patch('features/:featureId')
  async updateFeature(
    @CurrentUser() currentUser: CurrentUserContext,
    @Param('featureId', new ParseUUIDPipe({ version: '4' }))
    featureId: string,
    @Body() dto: UpdateFeatureDto,
  ) {
    return this.featuresService.updateFeature(currentUser, featureId, dto);
  }

  @Delete('features/:featureId')
  @HttpCode(204)
  async deleteFeature(
    @CurrentUser() currentUser: CurrentUserContext,
    @Param('featureId', new ParseUUIDPipe({ version: '4' }))
    featureId: string,
  ): Promise<void> {
    await this.featuresService.deleteFeature(currentUser, featureId);
  }
}
