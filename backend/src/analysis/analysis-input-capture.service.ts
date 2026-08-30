import { Injectable } from '@nestjs/common';

import type { CurrentUserContext } from '../auth/current-user-context';
import { formatPublicKey, parsePublicKey } from '../common/public-identifiers';
import { ContextService } from '../context/context.service';
import { PrismaService } from '../database/prisma.service';
import { FeaturesService } from '../features/features.service';
import { WorkspaceService } from '../workspace/workspace.service';
import {
  ANALYSIS_INPUT_SNAPSHOT_VERSION,
  createImmutableAnalysisInputSnapshot,
  createSourceIdentifier,
  parseVersionIdentifier,
  validateAnalysisSettings,
  type AnalysisInputSnapshotV1,
} from './contracts/analysis-contracts';
import type {
  AnalysisInputCapturePort,
  CaptureAnalysisInputCommand,
} from './ports/analysis-application.port';

@Injectable()
export class AnalysisInputCaptureService implements AnalysisInputCapturePort {
  constructor(
    private readonly contextService: ContextService,
    private readonly featuresService: FeaturesService,
    private readonly prismaService: PrismaService,
    private readonly workspaceService: WorkspaceService,
  ) {}

  async captureInputSnapshot(
    currentUser: CurrentUserContext,
    command: CaptureAnalysisInputCommand,
  ): Promise<AnalysisInputSnapshotV1> {
    const projectPublicNumber = parsePublicKey('project', command.projectKey);
    const featurePublicNumber = parsePublicKey('feature', command.featureKey);

    validateAnalysisSettings(command.analysisSettings);

    return this.prismaService.$transaction(async (transaction) => {
      const capturedAt = new Date();
      const project = await this.workspaceService.getAnalysisProjectInput(
        transaction,
        currentUser,
        projectPublicNumber,
      );
      const feature = await this.featuresService.getAnalysisFeatureInput(
        transaction,
        currentUser,
        project.id,
        featurePublicNumber,
      );
      const featureContext =
        await this.contextService.captureAnalysisContextInput(
          transaction,
          feature.id,
          capturedAt,
        );
      const projectKey = formatPublicKey('project', project.publicNumber);
      const featureKey = formatPublicKey('feature', feature.publicNumber);
      const featureContextKey = formatPublicKey(
        'contextArtifact',
        featureContext.publicNumber,
      );
      const projectContext =
        project.context === null
          ? null
          : (() => {
              const publicKey = formatPublicKey(
                'projectContext',
                project.context.publicNumber,
              );

              return {
                publicKey,
                sourceId: createSourceIdentifier('project_context', publicKey),
                content: project.context.content,
              };
            })();

      return createImmutableAnalysisInputSnapshot({
        contractVersion: ANALYSIS_INPUT_SNAPSHOT_VERSION,
        capturedAt: capturedAt.toISOString(),
        feature: {
          publicKey: featureKey,
          projectKey,
          specificationSourceId: createSourceIdentifier(
            'feature_specification',
            featureKey,
          ),
          title: feature.title,
          specificationContent: feature.specificationContent,
        },
        featureContext: {
          publicKey: featureContextKey,
          sourceId: createSourceIdentifier(
            'feature_context',
            featureContextKey,
          ),
          content: featureContext.content,
        },
        projectContext,
        files: featureContext.files.map((file) => {
          const publicKey = formatPublicKey('storageObject', file.publicNumber);

          return {
            sourceId: createSourceIdentifier('uploaded_file', publicKey),
            publicKey,
            assetType: file.assetType,
            filename: file.filename,
            preparationVersion: parseVersionIdentifier(file.preparationVersion),
            original: file.original,
            prepared: file.prepared,
          };
        }),
        analysisSettings: command.analysisSettings,
      });
    });
  }
}
