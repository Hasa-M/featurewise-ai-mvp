import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Redirect,
  UseGuards,
} from '@nestjs/common';

import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { CurrentUserContext } from '../auth/current-user-context';
import {
  ConnectRepositoryDto,
  PaginationQueryDto,
  RepositoryTreeQueryDto,
  UpdateFeatureRepositoryContextDto,
  UpdateProjectRepositoryDto,
} from './dto/repository-context.dto';
import { RepositoryContextService } from './repository-context.service';
import { RepositoryProviderError } from './ports/repository-provider.port';

@Controller()
export class RepositoryContextController {
  constructor(private readonly service: RepositoryContextService) {}

  @Post('projects/:projectKey/repository/github/attempts')
  @UseGuards(AuthGuard)
  createAttempt(
    @CurrentUser() user: CurrentUserContext,
    @Param('projectKey') projectKey: string,
  ) {
    return this.service.createAttempt(user, projectKey);
  }

  @Get('integrations/github/callback')
  @Redirect()
  async callback(
    @Query('code') code?: string,
    @Query('state') state?: string,
    @Query('installation_id') installationId?: string,
  ) {
    return {
      url: await this.service.handleCallback({ code, state, installationId }),
      statusCode: 302,
    };
  }

  @Get('projects/:projectKey/repository/github/available-repositories')
  @UseGuards(AuthGuard)
  async available(
    @CurrentUser() user: CurrentUserContext,
    @Param('projectKey') projectKey: string,
    @Query() query: PaginationQueryDto,
  ) {
    try {
      return await this.service.listAvailableRepositories(
        user,
        projectKey,
        query.page,
        query.pageSize,
      );
    } catch (error) {
      if (error instanceof RepositoryProviderError)
        this.service.throwProviderError(error);
      throw error;
    }
  }

  @Post('projects/:projectKey/repository')
  @UseGuards(AuthGuard)
  async connect(
    @CurrentUser() user: CurrentUserContext,
    @Param('projectKey') projectKey: string,
    @Body() dto: ConnectRepositoryDto,
  ) {
    try {
      return await this.service.connectRepository(user, projectKey, dto);
    } catch (error) {
      if (error instanceof RepositoryProviderError)
        this.service.throwProviderError(error);
      throw error;
    }
  }

  @Get('projects/:projectKey/repository')
  @UseGuards(AuthGuard)
  get(
    @CurrentUser() user: CurrentUserContext,
    @Param('projectKey') projectKey: string,
  ) {
    return this.service.getProjectRepository(user, projectKey);
  }

  @Patch('projects/:projectKey/repository')
  @UseGuards(AuthGuard)
  async patch(
    @CurrentUser() user: CurrentUserContext,
    @Param('projectKey') projectKey: string,
    @Body() dto: UpdateProjectRepositoryDto,
  ) {
    try {
      return await this.service.updateBaseBranch(
        user,
        projectKey,
        dto.baseBranch,
      );
    } catch (error) {
      if (error instanceof RepositoryProviderError)
        this.service.throwProviderError(error);
      throw error;
    }
  }

  @Delete('projects/:projectKey/repository')
  @UseGuards(AuthGuard)
  @HttpCode(204)
  disconnect(
    @CurrentUser() user: CurrentUserContext,
    @Param('projectKey') projectKey: string,
  ) {
    return this.service.disconnect(user, projectKey);
  }

  @Get('projects/:projectKey/repository/branches')
  @UseGuards(AuthGuard)
  async branches(
    @CurrentUser() user: CurrentUserContext,
    @Param('projectKey') projectKey: string,
    @Query() query: PaginationQueryDto,
  ) {
    try {
      return await this.service.listBranches(
        user,
        projectKey,
        query.page,
        query.pageSize,
      );
    } catch (error) {
      if (error instanceof RepositoryProviderError)
        this.service.throwProviderError(error);
      throw error;
    }
  }

  @Get('projects/:projectKey/repository/tree')
  @UseGuards(AuthGuard)
  async tree(
    @CurrentUser() user: CurrentUserContext,
    @Param('projectKey') projectKey: string,
    @Query() query: RepositoryTreeQueryDto,
  ) {
    try {
      return await this.service.listTree(user, projectKey, query);
    } catch (error) {
      if (error instanceof RepositoryProviderError)
        this.service.throwProviderError(error);
      throw error;
    }
  }

  @Get('features/:featureKey/repository-context')
  @UseGuards(AuthGuard)
  feature(
    @CurrentUser() user: CurrentUserContext,
    @Param('featureKey') featureKey: string,
  ) {
    return this.service.getFeatureContext(user, featureKey);
  }

  @Put('features/:featureKey/repository-context')
  @UseGuards(AuthGuard)
  async updateFeature(
    @CurrentUser() user: CurrentUserContext,
    @Param('featureKey') featureKey: string,
    @Body() dto: UpdateFeatureRepositoryContextDto,
  ) {
    try {
      return await this.service.updateFeatureContext(user, featureKey, dto);
    } catch (error) {
      if (error instanceof RepositoryProviderError)
        this.service.throwProviderError(error);
      throw error;
    }
  }
}
