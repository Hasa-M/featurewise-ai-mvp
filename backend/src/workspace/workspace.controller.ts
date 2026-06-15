import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
} from '@nestjs/common';

import { FakeAuthService } from '../auth/fake-auth.service';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { WorkspaceService } from './workspace.service';

@Controller('organizations')
export class WorkspaceController {
  constructor(
    private readonly fakeAuthService: FakeAuthService,
    private readonly workspaceService: WorkspaceService,
  ) {}

  @Get(':organizationId')
  async getOrganization(
    @Param('organizationId', new ParseUUIDPipe({ version: '4' }))
    organizationId: string,
  ) {
    return this.workspaceService.getOrganization(
      await this.fakeAuthService.getCurrentUser(),
      organizationId,
    );
  }

  @Patch(':organizationId')
  async updateOrganization(
    @Param('organizationId', new ParseUUIDPipe({ version: '4' }))
    organizationId: string,
    @Body() dto: UpdateOrganizationDto,
  ) {
    return this.workspaceService.updateOrganization(
      await this.fakeAuthService.getCurrentUser(),
      organizationId,
      dto,
    );
  }

  @Get(':organizationId/projects')
  async listProjects(
    @Param('organizationId', new ParseUUIDPipe({ version: '4' }))
    organizationId: string,
  ) {
    return this.workspaceService.listProjects(
      await this.fakeAuthService.getCurrentUser(),
      organizationId,
    );
  }

  @Get(':organizationId/projects/:projectId')
  async getProject(
    @Param('organizationId', new ParseUUIDPipe({ version: '4' }))
    organizationId: string,
    @Param('projectId', new ParseUUIDPipe({ version: '4' }))
    projectId: string,
  ) {
    return this.workspaceService.getProject(
      await this.fakeAuthService.getCurrentUser(),
      organizationId,
      projectId,
    );
  }

  @Patch(':organizationId/projects/:projectId')
  async updateProject(
    @Param('organizationId', new ParseUUIDPipe({ version: '4' }))
    organizationId: string,
    @Param('projectId', new ParseUUIDPipe({ version: '4' }))
    projectId: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.workspaceService.updateProject(
      await this.fakeAuthService.getCurrentUser(),
      organizationId,
      projectId,
      dto,
    );
  }
}
