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
} from '@nestjs/common';

import { FakeAuthService } from '../auth/fake-auth.service';
import { CreateFeatureDto } from './dto/create-feature.dto';
import { UpdateFeatureDto } from './dto/update-feature.dto';
import { FeaturesService } from './features.service';

@Controller()
export class FeaturesController {
  constructor(
    private readonly fakeAuthService: FakeAuthService,
    private readonly featuresService: FeaturesService,
  ) {}

  @Get('organizations/:organizationId/projects/:projectId/features')
  async listFeatures(
    @Param('organizationId', new ParseUUIDPipe({ version: '4' }))
    organizationId: string,
    @Param('projectId', new ParseUUIDPipe({ version: '4' }))
    projectId: string,
  ) {
    return this.featuresService.listFeatures(
      await this.fakeAuthService.getCurrentUser(),
      organizationId,
      projectId,
    );
  }

  @Post('organizations/:organizationId/projects/:projectId/features')
  async createFeature(
    @Param('organizationId', new ParseUUIDPipe({ version: '4' }))
    organizationId: string,
    @Param('projectId', new ParseUUIDPipe({ version: '4' }))
    projectId: string,
    @Body() dto: CreateFeatureDto,
  ) {
    return this.featuresService.createFeature(
      await this.fakeAuthService.getCurrentUser(),
      organizationId,
      projectId,
      dto,
    );
  }

  @Get('features/:featureId')
  async getFeature(
    @Param('featureId', new ParseUUIDPipe({ version: '4' }))
    featureId: string,
  ) {
    return this.featuresService.getFeature(
      await this.fakeAuthService.getCurrentUser(),
      featureId,
    );
  }

  @Patch('features/:featureId')
  async updateFeature(
    @Param('featureId', new ParseUUIDPipe({ version: '4' }))
    featureId: string,
    @Body() dto: UpdateFeatureDto,
  ) {
    return this.featuresService.updateFeature(
      await this.fakeAuthService.getCurrentUser(),
      featureId,
      dto,
    );
  }

  @Delete('features/:featureId')
  @HttpCode(204)
  async deleteFeature(
    @Param('featureId', new ParseUUIDPipe({ version: '4' }))
    featureId: string,
  ): Promise<void> {
    await this.featuresService.deleteFeature(
      await this.fakeAuthService.getCurrentUser(),
      featureId,
    );
  }
}
