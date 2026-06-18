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
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { WorkspaceService } from './workspace.service';

@Controller()
@UseGuards(AuthGuard)
export class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceService) {}

  @Get('organizations/:organizationId')
  async getOrganization(
    @CurrentUser() currentUser: CurrentUserContext,
    @Param('organizationId', new ParseUUIDPipe({ version: '4' }))
    organizationId: string,
  ) {
    return this.workspaceService.getOrganization(currentUser, organizationId);
  }

  @Patch('organizations/:organizationId')
  async updateOrganization(
    @CurrentUser() currentUser: CurrentUserContext,
    @Param('organizationId', new ParseUUIDPipe({ version: '4' }))
    organizationId: string,
    @Body() dto: UpdateOrganizationDto,
  ) {
    return this.workspaceService.updateOrganization(
      currentUser,
      organizationId,
      dto,
    );
  }

  @Get('organizations/:organizationId/projects')
  async listProjects(
    @CurrentUser() currentUser: CurrentUserContext,
    @Param('organizationId', new ParseUUIDPipe({ version: '4' }))
    organizationId: string,
  ) {
    return this.workspaceService.listProjects(currentUser, organizationId);
  }

  @Get('projects/:projectId')
  async getProject(
    @CurrentUser() currentUser: CurrentUserContext,
    @Param('projectId', new ParseUUIDPipe({ version: '4' }))
    projectId: string,
  ) {
    return this.workspaceService.getProject(currentUser, projectId);
  }

  @Patch('projects/:projectId')
  async updateProject(
    @CurrentUser() currentUser: CurrentUserContext,
    @Param('projectId', new ParseUUIDPipe({ version: '4' }))
    projectId: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.workspaceService.updateProject(currentUser, projectId, dto);
  }
}
