import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { CurrentUserContext } from '../auth/current-user-context';
import {
  ParsePublicKeyPipe,
  type ParsedPublicNumber,
} from '../common/public-identifiers';
import { CreateFeatureDto } from './dto/create-feature.dto';
import { UpdateFeatureDto } from './dto/update-feature.dto';
import { FeaturesService } from './features.service';

@Controller()
@UseGuards(AuthGuard)
export class FeaturesController {
  constructor(private readonly featuresService: FeaturesService) {}

  @Get('projects/:projectKey/features')
  async listFeatures(
    @CurrentUser() currentUser: CurrentUserContext,
    @Param('projectKey', new ParsePublicKeyPipe('project'))
    projectPublicNumber: ParsedPublicNumber,
  ) {
    return this.featuresService.listFeatures(
      currentUser,
      projectPublicNumber.value,
    );
  }

  @Post('projects/:projectKey/features')
  async createFeature(
    @CurrentUser() currentUser: CurrentUserContext,
    @Param('projectKey', new ParsePublicKeyPipe('project'))
    projectPublicNumber: ParsedPublicNumber,
    @Body() dto: CreateFeatureDto,
  ) {
    return this.featuresService.createFeature(
      currentUser,
      projectPublicNumber.value,
      dto,
    );
  }

  @Get('projects/:projectKey/features/:featureKey')
  async getProjectFeature(
    @CurrentUser() currentUser: CurrentUserContext,
    @Param('projectKey', new ParsePublicKeyPipe('project'))
    projectPublicNumber: ParsedPublicNumber,
    @Param('featureKey', new ParsePublicKeyPipe('feature'))
    featurePublicNumber: ParsedPublicNumber,
  ) {
    return this.featuresService.getProjectFeature(
      currentUser,
      projectPublicNumber.value,
      featurePublicNumber.value,
    );
  }

  @Get('features/:featureKey')
  async getFeature(
    @CurrentUser() currentUser: CurrentUserContext,
    @Param('featureKey', new ParsePublicKeyPipe('feature'))
    featurePublicNumber: ParsedPublicNumber,
  ) {
    return this.featuresService.getFeature(
      currentUser,
      featurePublicNumber.value,
    );
  }

  @Patch('features/:featureKey')
  async updateFeature(
    @CurrentUser() currentUser: CurrentUserContext,
    @Param('featureKey', new ParsePublicKeyPipe('feature'))
    featurePublicNumber: ParsedPublicNumber,
    @Body() dto: UpdateFeatureDto,
  ) {
    return this.featuresService.updateFeature(
      currentUser,
      featurePublicNumber.value,
      dto,
    );
  }

  @Delete('features/:featureKey')
  @HttpCode(204)
  async deleteFeature(
    @CurrentUser() currentUser: CurrentUserContext,
    @Param('featureKey', new ParsePublicKeyPipe('feature'))
    featurePublicNumber: ParsedPublicNumber,
  ): Promise<void> {
    await this.featuresService.deleteFeature(
      currentUser,
      featurePublicNumber.value,
    );
  }
}
