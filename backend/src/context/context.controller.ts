import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';

import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { CurrentUserContext } from '../auth/current-user-context';
import {
  ParsePublicKeyPipe,
  type ParsedPublicNumber,
} from '../common/public-identifiers';
import { ContextService } from './context.service';
import { CreateContextFileDto } from './dto/create-context-file.dto';
import { ListContextFilesQueryDto } from './dto/list-context-files-query.dto';
import { StorageObjectAccessQueryDto } from './dto/storage-object-access-query.dto';
import { UpdateFeatureContextDto } from './dto/update-feature-context.dto';
import { UpdateStorageObjectSelectionDto } from './dto/update-storage-object-selection.dto';

@Controller()
@UseGuards(AuthGuard)
export class ContextController {
  constructor(private readonly contextService: ContextService) {}

  @Get('features/:featureKey/context')
  getFeatureContext(
    @CurrentUser() currentUser: CurrentUserContext,
    @Param('featureKey', new ParsePublicKeyPipe('feature'))
    featurePublicNumber: ParsedPublicNumber,
  ) {
    return this.contextService.getFeatureContext(
      currentUser,
      featurePublicNumber.value,
    );
  }

  @Patch('features/:featureKey/context')
  updateFeatureContext(
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

  @Get('feature-updates/:featureUpdateKey/context')
  getFeatureUpdateContext(
    @CurrentUser() currentUser: CurrentUserContext,
    @Param('featureUpdateKey', new ParsePublicKeyPipe('featureUpdate'))
    featureUpdatePublicNumber: ParsedPublicNumber,
  ) {
    return this.contextService.getFeatureUpdateContext(
      currentUser,
      featureUpdatePublicNumber.value,
    );
  }

  @Patch('feature-updates/:featureUpdateKey/context')
  updateFeatureUpdateContext(
    @CurrentUser() currentUser: CurrentUserContext,
    @Param('featureUpdateKey', new ParsePublicKeyPipe('featureUpdate'))
    featureUpdatePublicNumber: ParsedPublicNumber,
    @Body() dto: UpdateFeatureContextDto,
  ) {
    return this.contextService.updateFeatureUpdateContext(
      currentUser,
      featureUpdatePublicNumber.value,
      dto,
    );
  }

  @Post('features/:featureKey/context/files')
  createFeatureContextFile(
    @CurrentUser() currentUser: CurrentUserContext,
    @Param('featureKey', new ParsePublicKeyPipe('feature'))
    featurePublicNumber: ParsedPublicNumber,
    @Body() dto: CreateContextFileDto,
  ) {
    return this.contextService.createFeatureContextFile(
      currentUser,
      featurePublicNumber.value,
      dto,
    );
  }

  @Post('feature-updates/:featureUpdateKey/context/files')
  createFeatureUpdateContextFile(
    @CurrentUser() currentUser: CurrentUserContext,
    @Param('featureUpdateKey', new ParsePublicKeyPipe('featureUpdate'))
    featureUpdatePublicNumber: ParsedPublicNumber,
    @Body() dto: CreateContextFileDto,
  ) {
    return this.contextService.createFeatureUpdateContextFile(
      currentUser,
      featureUpdatePublicNumber.value,
      dto,
    );
  }

  @Get('features/:featureKey/context/files/archive')
  listFeatureContextArchive(
    @CurrentUser() currentUser: CurrentUserContext,
    @Param('featureKey', new ParsePublicKeyPipe('feature'))
    featurePublicNumber: ParsedPublicNumber,
    @Query() query: ListContextFilesQueryDto,
  ) {
    return this.contextService.listFeatureContextArchive(
      currentUser,
      featurePublicNumber.value,
      query,
    );
  }

  @Get('feature-updates/:featureUpdateKey/context/files/archive')
  listFeatureUpdateContextArchive(
    @CurrentUser() currentUser: CurrentUserContext,
    @Param('featureUpdateKey', new ParsePublicKeyPipe('featureUpdate'))
    featureUpdatePublicNumber: ParsedPublicNumber,
    @Query() query: ListContextFilesQueryDto,
  ) {
    return this.contextService.listFeatureUpdateContextArchive(
      currentUser,
      featureUpdatePublicNumber.value,
      query,
    );
  }

  @Post('storage-objects/:storageObjectKey/confirm')
  async confirmStorageObject(
    @CurrentUser() currentUser: CurrentUserContext,
    @Param('storageObjectKey', new ParsePublicKeyPipe('storageObject'))
    storageObjectPublicNumber: ParsedPublicNumber,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.contextService.confirmStorageObject(
      currentUser,
      storageObjectPublicNumber.value,
    );
    response.status(result.accepted ? 202 : 200);

    return result.file;
  }

  @Patch('storage-objects/:storageObjectKey/selection')
  updateStorageObjectSelection(
    @CurrentUser() currentUser: CurrentUserContext,
    @Param('storageObjectKey', new ParsePublicKeyPipe('storageObject'))
    storageObjectPublicNumber: ParsedPublicNumber,
    @Body() dto: UpdateStorageObjectSelectionDto,
  ) {
    return this.contextService.updateStorageObjectSelection(
      currentUser,
      storageObjectPublicNumber.value,
      dto.selected,
    );
  }

  @Get('storage-objects/:storageObjectKey/access-url')
  createStorageObjectAccessUrl(
    @CurrentUser() currentUser: CurrentUserContext,
    @Param('storageObjectKey', new ParsePublicKeyPipe('storageObject'))
    storageObjectPublicNumber: ParsedPublicNumber,
    @Query() query: StorageObjectAccessQueryDto,
  ) {
    return this.contextService.createStorageObjectAccessUrl(
      currentUser,
      storageObjectPublicNumber.value,
      query.disposition ?? 'attachment',
    );
  }

  @Delete('storage-objects/:storageObjectKey')
  @HttpCode(202)
  purgeStorageObject(
    @CurrentUser() currentUser: CurrentUserContext,
    @Param('storageObjectKey', new ParsePublicKeyPipe('storageObject'))
    storageObjectPublicNumber: ParsedPublicNumber,
  ) {
    return this.contextService.purgeStorageObject(
      currentUser,
      storageObjectPublicNumber.value,
    );
  }
}
