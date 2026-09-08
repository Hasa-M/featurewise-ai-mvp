import type { INestApplication } from '@nestjs/common';
import { ApiProperty, DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { SchemaObject, OperationObject } from '@nestjs/swagger';
import { LoginRequestDto } from './auth/dto/login-request.dto';
import { CreateFeatureDto } from './features/dto/create-feature.dto';
import { UpdateFeatureDto } from './features/dto/update-feature.dto';
import { UpdateOrganizationDto } from './workspace/dto/update-organization.dto';
import { UpdateProjectDto } from './workspace/dto/update-project.dto';
import { UpdateProjectContextDto } from './workspace/dto/update-project-context.dto';
import { UpdateFeatureContextDto } from './context/dto/update-feature-context.dto';
import { CreateContextFileDto } from './context/dto/create-context-file.dto';
import { UpdateStorageObjectSelectionDto } from './context/dto/update-storage-object-selection.dto';
import { ListContextFilesQueryDto } from './context/dto/list-context-files-query.dto';
import { StorageObjectAccessQueryDto } from './context/dto/storage-object-access-query.dto';
import {
  AvailableRepositoriesQueryDto,
  ConnectRepositoryDto,
  CreateGitHubAttemptDto,
  PaginationQueryDto,
  RepositoryTreeQueryDto,
  UpdateFeatureRepositoryContextDto,
  UpdateProjectRepositoryDto,
} from './repository-context/dto/repository-context.dto';

const str: SchemaObject = { type: 'string' };
const bool: SchemaObject = { type: 'boolean' };
const integer: SchemaObject = { type: 'integer' };
const date: SchemaObject = { type: 'string', format: 'date-time' };
const nullable = (schema: SchemaObject): SchemaObject => ({
  ...schema,
  nullable: true,
});
const array = (items: SchemaObject): SchemaObject => ({ type: 'array', items });
const object = (
  properties: Record<string, SchemaObject>,
  required = Object.keys(properties),
): SchemaObject => ({ type: 'object', properties, required });
const key = (prefix: string): SchemaObject => ({
  type: 'string',
  pattern: `^${prefix}-[1-9][0-9]*$`,
  example: `${prefix}-1`,
});
const timestamps = { createdAt: date, updatedAt: date };

// Explicit metadata also works under ts-node: no build-only Swagger transformer is required.
function describeDto(
  target: { prototype: object },
  properties: Record<string, SchemaObject>,
  optional: string[] = [],
) {
  for (const [name, schema] of Object.entries(properties)) {
    ApiProperty({ ...schema, required: !optional.includes(name) } as Parameters<
      typeof ApiProperty
    >[0])(target.prototype, name);
  }
}

export function setupOpenApi(app: INestApplication) {
  describeDto(LoginRequestDto, {
    username: { ...str, maxLength: 100 },
    password: { ...str, maxLength: 1000, writeOnly: true },
  });
  const featureInput = {
    title: { ...str, maxLength: 180, pattern: '\\S' },
    specificationContent: { ...str, maxLength: 2000 },
  };
  describeDto(CreateFeatureDto, featureInput, ['specificationContent']);
  describeDto(UpdateFeatureDto, featureInput, [
    'title',
    'specificationContent',
  ]);
  for (const dto of [UpdateOrganizationDto, UpdateProjectDto])
    describeDto(dto, { name: { ...str, maxLength: 120, pattern: '\\S' } });
  for (const dto of [UpdateProjectContextDto, UpdateFeatureContextDto])
    describeDto(dto, { content: { ...str, maxLength: 20000 } });
  describeDto(CreateContextFileDto, {
    filename: { ...str, maxLength: 255 },
    mimeType: { ...str, maxLength: 255 },
    sizeBytes: { ...integer, minimum: 1, maximum: 26214400 },
    checksumSha256: { ...str, pattern: '^[A-Za-z0-9+/]{43}=$' },
  });
  describeDto(UpdateStorageObjectSelectionDto, { selected: bool });
  describeDto(
    ListContextFilesQueryDto,
    {
      cursor: key('OBJ'),
      limit: { ...integer, minimum: 1, maximum: 20, default: 20 },
      query: { ...str, maxLength: 100 },
    },
    ['cursor', 'limit', 'query'],
  );
  describeDto(
    StorageObjectAccessQueryDto,
    {
      disposition: {
        ...str,
        enum: ['inline', 'attachment'],
        default: 'attachment',
      },
    },
    ['disposition'],
  );
  describeDto(
    PaginationQueryDto,
    {
      page: { ...integer, minimum: 1, default: 1 },
      pageSize: { ...integer, minimum: 1, maximum: 100, default: 50 },
    },
    ['page', 'pageSize'],
  );
  const externalId = {
    ...str,
    pattern: '^[1-9][0-9]*$',
    description: 'GitHub numeric identity encoded as a string',
  };
  describeDto(
    ConnectRepositoryDto,
    { repositoryId: externalId, installationId: externalId },
    ['installationId'],
  );
  describeDto(AvailableRepositoriesQueryDto, { installationId: externalId }, [
    'installationId',
  ]);
  describeDto(
    CreateGitHubAttemptDto,
    { mode: { ...str, enum: ['authorize', 'install'], default: 'authorize' } },
    ['mode'],
  );
  describeDto(UpdateProjectRepositoryDto, {
    baseBranch: { ...str, maxLength: 255 },
  });
  describeDto(
    RepositoryTreeQueryDto,
    {
      branch: { ...str, maxLength: 255 },
      commitSha: { ...str, pattern: '^[0-9a-fA-F]{40,64}$' },
      path: { ...str, maxLength: 4096, default: '' },
    },
    ['commitSha', 'path'],
  );
  describeDto(
    UpdateFeatureRepositoryContextDto,
    {
      branchOverride: { ...nullable(str), maxLength: 255 },
      selectedPaths: { ...array({ ...str, maxLength: 4096 }), maxItems: 50 },
    },
    ['branchOverride'],
  );

  const config = new DocumentBuilder()
    .setTitle('Featurewise local API')
    .setVersion('1')
    .setDescription(
      'Implemented Console endpoints. Analysis execution and snapshot HTTP endpoints are deferred. Use public keys, never domain UUIDs.',
    )
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  const user = object({
    userKey: key('USR'),
    username: str,
    organizationKey: key('ORG'),
    projectKey: key('PRJ'),
  });
  const feature = object({
    publicKey: key('FEAT'),
    projectKey: key('PRJ'),
    title: str,
    specificationContent: str,
    createdByKey: key('USR'),
    ...timestamps,
  });
  const organization = object({
    publicKey: key('ORG'),
    name: str,
    ...timestamps,
  });
  const project = object({
    publicKey: key('PRJ'),
    organizationKey: key('ORG'),
    name: str,
    ...timestamps,
  });
  const file = object({
    publicKey: key('OBJ'),
    filename: str,
    mimeType: str,
    sizeBytes: integer,
    assetType: { ...str, enum: ['file', 'image'] },
    status: {
      ...str,
      enum: ['pending_upload', 'processing', 'ready', 'failed'],
    },
    selected: bool,
    canDeletePermanently: bool,
    failure: nullable(object({ code: str, message: nullable(str) })),
    readyAt: nullable(date),
    ...timestamps,
  });
  const context = object({
    publicKey: key('CTX'),
    featureKey: key('FEAT'),
    content: str,
    files: array(file),
    ...timestamps,
  });
  const projectContext = object({
    publicKey: key('PCTX'),
    projectKey: key('PRJ'),
    content: str,
    ...timestamps,
  });
  const repo = object({
    repositoryId: externalId,
    owner: str,
    name: str,
    fullName: str,
    private: bool,
    defaultBranch: str,
  });
  const states = {
    ...str,
    enum: [
      'integration_disabled',
      'disconnected',
      'connecting',
      'repository_selection',
      'connected',
      'inaccessible',
      'rate_limited',
    ],
  };
  const connection = object(
    {
      publicKey: key('REPO'),
      repositoryId: externalId,
      owner: str,
      name: str,
      fullName: str,
      private: bool,
      defaultBranch: str,
      baseBranch: str,
      lastCheckedAt: nullable(date),
      rateLimitResetAt: nullable(date),
      lastErrorCode: nullable(str),
      lastErrorMessage: nullable(str),
      status: states,
      ...timestamps,
    },
    ['publicKey', 'fullName', 'baseBranch', 'defaultBranch'],
  );
  const repoState = object(
    {
      state: states,
      githubAppAccessUrl: str,
      connection,
      attemptExpiresAt: date,
      installations: array(
        object({ installationId: externalId, accountLogin: str }),
      ),
    },
    ['state'],
  );
  const featureRepo = object(
    {
      state: states,
      featureKey: key('FEAT'),
      repositoryKey: key('REPO'),
      fullName: str,
      branchOverride: nullable(str),
      effectiveBranch: str,
      baseBranch: str,
      defaultBranch: str,
      selectedFiles: array(object({ path: str })),
    },
    ['state', 'featureKey'],
  );
  const page = (items: SchemaObject) =>
    object({
      items: array(items),
      page: integer,
      pageSize: integer,
      hasNextPage: bool,
    });
  const schemas: Record<string, SchemaObject> = {
    AuthController_login: object({
      accessToken: str,
      expiresInSeconds: integer,
      tokenType: { ...str, enum: ['Bearer'] },
      user,
    }),
    AuthController_getCurrentUser: user,
    FeaturesController_listFeatures: array(feature),
    ...Object.fromEntries(
      ['createFeature', 'getProjectFeature', 'getFeature', 'updateFeature'].map(
        (name) => [`FeaturesController_${name}`, feature],
      ),
    ),
    WorkspaceController_getOrganization: organization,
    WorkspaceController_updateOrganization: organization,
    WorkspaceController_listProjects: array(project),
    WorkspaceController_getProject: project,
    WorkspaceController_updateProject: project,
    WorkspaceController_getProjectContext: projectContext,
    WorkspaceController_updateProjectContext: projectContext,
    ContextController_getFeatureContext: context,
    ContextController_updateFeatureContext: context,
    ContextController_createFeatureContextFile: object({
      file,
      upload: object({
        expiresAt: date,
        fields: { type: 'object', additionalProperties: str },
        url: str,
      }),
    }),
    ContextController_listFeatureContextArchive: object({
      files: array(file),
      nextCursor: nullable(key('OBJ')),
    }),
    ContextController_confirmStorageObject: file,
    ContextController_updateStorageObjectSelection: file,
    ContextController_createStorageObjectAccessUrl: object({
      url: str,
      expiresAt: date,
      disposition: str,
    }),

    RepositoryContextController_createAttempt: object({
      redirectUrl: str,
      expiresAt: date,
    }),
    RepositoryContextController_available: page(repo),
    RepositoryContextController_get: repoState,
    RepositoryContextController_connect: repoState,
    RepositoryContextController_patch: repoState,
    RepositoryContextController_branches: page(
      object({ name: str, commitSha: str }),
    ),
    RepositoryContextController_tree: {
      ...page(
        object({
          path: str,
          name: str,
          kind: str,
          sizeBytes: nullable(integer),
          selectable: bool,
          disabledReason: nullable(str),
        }),
      ),
      properties: {
        ...page(str).properties,
        items: array(
          object({
            path: str,
            name: str,
            kind: str,
            sizeBytes: nullable(integer),
            selectable: bool,
            disabledReason: nullable(str),
          }),
        ),
        commitSha: str,
        branch: str,
        path: str,
      },
    },
    RepositoryContextController_feature: featureRepo,
    RepositoryContextController_updateFeature: featureRepo,
    HealthController_getHealth: object({
      status: str,
      service: str,
      timestamp: date,
      environment: str,
      uptimeSeconds: integer,
    }),
    HealthController_getDatabaseHealth: object({
      status: str,
      database: str,
      timestamp: date,
      responseTimeMs: integer,
    }),
  };
  const prefixes: Record<string, string> = {
    featureKey: 'FEAT',
    projectKey: 'PRJ',
    organizationKey: 'ORG',
    storageObjectKey: 'OBJ',
  };
  for (const [path, item] of Object.entries(document.paths)) {
    for (const method of ['get', 'post', 'patch', 'put', 'delete'] as const) {
      const operation: OperationObject | undefined = item[method];
      if (!operation) continue;
      const publicRoute =
        path.startsWith('/health') ||
        path === '/auth/login' ||
        path === '/integrations/github/callback';
      operation.security = publicRoute ? [] : [{ bearer: [] }];
      operation.parameters ??= [];
      // Branded ParsedPublicNumber parameters are erased at runtime. Recover
      // their public route names rather than documenting internal UUIDs.
      for (const match of path.matchAll(/\{([^}]+)\}/g)) {
        const name = match[1];
        if (
          !operation.parameters.some(
            (parameter) =>
              'name' in parameter &&
              parameter.in === 'path' &&
              parameter.name === name,
          )
        ) {
          operation.parameters.push({
            name,
            in: 'path',
            required: true,
            schema: prefixes[name] ? key(prefixes[name]) : str,
          });
        }
      }
      for (const parameter of operation.parameters ?? []) {
        if (
          'in' in parameter &&
          parameter.in === 'path' &&
          prefixes[parameter.name]
        )
          parameter.schema = key(prefixes[parameter.name]);
      }
      operation.responses['400'] = {
        description: 'Invalid request or public key',
      };
      if (!publicRoute) {
        operation.responses['401'] = {
          description: 'Missing or invalid bearer token',
        };
        operation.responses['404'] = {
          description: 'Resource unavailable to the current operator',
        };
        operation.responses['409'] = {
          description: 'State, selection, or concurrency conflict',
        };
      }
      if (
        path.includes('repository') ||
        path.includes('storage') ||
        path.includes('/files')
      )
        operation.responses['503'] = {
          description: 'External provider unavailable or unconfigured',
        };
      const schema = schemas[operation.operationId ?? ''];
      if (schema) {
        const status =
          Object.keys(operation.responses).find((code) => /^2/.test(code)) ??
          '200';
        operation.responses[status] = {
          description: 'Success',
          content: { 'application/json': { schema } },
        };
        if (operation.operationId === 'ContextController_confirmStorageObject')
          operation.responses['202'] = operation.responses[status];
      }
      if (path === '/integrations/github/callback')
        operation.responses = {
          '302': {
            description: 'Redirect to Console or GitHub authorization',
            headers: { Location: { schema: str } },
          },
        };
    }
  }
  SwaggerModule.setup('docs', app, document, {
    jsonDocumentUrl: 'docs-json',
    swaggerOptions: { persistAuthorization: false },
  });
  return document;
}
