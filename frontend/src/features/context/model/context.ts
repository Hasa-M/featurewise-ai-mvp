import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import {
  confirmContextFile,
  createFeatureContextFile,
  getContextFileAccessUrl,
  getFeatureContext,
  getFeatureContextArchive,
  getProjectContext,
  permanentlyDeleteContextFile,
  updateContextFileSelection,
  updateFeatureContext,
  updateProjectContext,
  uploadFileToPresignedPost,
  type ContextDto,
  type ContextFileDto,
  type ProjectContextDto,
} from '../api';
import { sha256Base64 } from '../lib/file-format';

export interface ContextFile extends Omit<ContextFileDto, 'createdAt' | 'readyAt' | 'updatedAt'> {
  readonly createdAt: Date;
  readonly readyAt: Date | null;
  readonly updatedAt: Date;
}

export interface FeatureContext extends Omit<ContextDto, 'createdAt' | 'files' | 'updatedAt'> {
  readonly createdAt: Date;
  readonly files: readonly ContextFile[];
  readonly updatedAt: Date;
}

export interface ProjectContext
  extends Omit<ProjectContextDto, 'createdAt' | 'updatedAt'> {
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

function toContextFile(dto: ContextFileDto): ContextFile {
  return {
    ...dto,
    createdAt: new Date(dto.createdAt),
    readyAt: dto.readyAt === null ? null : new Date(dto.readyAt),
    updatedAt: new Date(dto.updatedAt),
  };
}

function toFeatureContext(dto: ContextDto): FeatureContext {
  return {
    ...dto,
    createdAt: new Date(dto.createdAt),
    files: dto.files.map(toContextFile),
    updatedAt: new Date(dto.updatedAt),
  };
}

export function toProjectContext(dto: ProjectContextDto): ProjectContext {
  return {
    ...dto,
    createdAt: new Date(dto.createdAt),
    updatedAt: new Date(dto.updatedAt),
  };
}

export const contextKeys = {
  archive: (featureKey: string, query: string) =>
    ['feature-context-archive', featureKey, query] as const,
  detail: (featureKey: string) => ['feature-context', featureKey] as const,
  projectDetail: (projectKey: string) =>
    ['project-context', projectKey] as const,
};

export function featureContextQueryOptions(
  accessToken: string,
  featureKey: string,
) {
  return queryOptions({
    queryKey: contextKeys.detail(featureKey),
    queryFn: async () => toFeatureContext(await getFeatureContext(accessToken, featureKey)),
    staleTime: 60 * 1000,
  });
}

export function useFeatureContext(accessToken: string, featureKey: string) {
  return useQuery({
    ...featureContextQueryOptions(accessToken, featureKey),
    refetchInterval: (query) => {
      const context = query.state.data;
      return context?.files.some(
        (file) => file.status === 'pending_upload' || file.status === 'processing',
      )
        ? 1500
        : false;
    },
  });
}

export function projectContextQueryOptions(
  accessToken: string,
  projectKey: string,
) {
  return queryOptions({
    queryKey: contextKeys.projectDetail(projectKey),
    queryFn: async () =>
      toProjectContext(await getProjectContext(accessToken, projectKey)),
    staleTime: 60 * 1000,
  });
}

export function useProjectContext(accessToken: string, projectKey: string) {
  return useQuery(projectContextQueryOptions(accessToken, projectKey));
}

export function useFeatureContextArchive(
  accessToken: string,
  featureKey: string,
  query: string,
  enabled: boolean,
) {
  return useQuery({
    enabled,
    queryKey: contextKeys.archive(featureKey, query),
    queryFn: async () => {
      const result = await getFeatureContextArchive(accessToken, featureKey, query);
      return { ...result, files: result.files.map(toContextFile) };
    },
    staleTime: 15 * 1000,
  });
}

function useInvalidateContext(featureKey: string) {
  const queryClient = useQueryClient();

  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: contextKeys.detail(featureKey) }),
      queryClient.invalidateQueries({
        queryKey: ['feature-context-archive', featureKey],
      }),
    ]);
  };
}

export function useUpdateFeatureContext(accessToken: string, featureKey: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (content: string) =>
      toFeatureContext(
        await updateFeatureContext(accessToken, featureKey, content),
      ),
    onSuccess: (context) => {
      queryClient.setQueryData(contextKeys.detail(featureKey), context);
    },
  });
}

export function useUpdateProjectContext(
  accessToken: string,
  projectKey: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (content: string) =>
      toProjectContext(
        await updateProjectContext(accessToken, projectKey, content),
      ),
    onSuccess: (context) => {
      queryClient.setQueryData(contextKeys.projectDetail(projectKey), context);
    },
  });
}

export function useUploadFeatureContextFile(
  accessToken: string,
  featureKey: string,
) {
  const invalidate = useInvalidateContext(featureKey);

  return useMutation({
    mutationFn: async ({
      file,
      onProgress,
    }: {
      readonly file: File;
      readonly onProgress: (percent: number) => void;
    }) => {
      const created = await createFeatureContextFile(accessToken, featureKey, {
        checksumSha256: await sha256Base64(file),
        filename: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
      });
      try {
        await uploadFileToPresignedPost(created.upload, file, onProgress);
        return toContextFile(
          await confirmContextFile(accessToken, created.file.publicKey),
        );
      } catch (error: unknown) {
        await permanentlyDeleteContextFile(
          accessToken,
          created.file.publicKey,
        ).catch(() => undefined);
        throw error;
      }
    },
    onSettled: invalidate,
  });
}

export function useSetContextFileSelection(
  accessToken: string,
  featureKey: string,
) {
  const invalidate = useInvalidateContext(featureKey);

  return useMutation({
    mutationFn: async ({
      fileKey,
      selected,
    }: {
      readonly fileKey: string;
      readonly selected: boolean;
    }) => toContextFile(await updateContextFileSelection(accessToken, fileKey, selected)),
    onSuccess: invalidate,
  });
}

export function useSelectArchivedContextFiles(
  accessToken: string,
  featureKey: string,
) {
  const invalidate = useInvalidateContext(featureKey);

  return useMutation({
    mutationFn: async (fileKeys: readonly string[]) => {
      for (const fileKey of fileKeys) {
        await updateContextFileSelection(accessToken, fileKey, true);
      }
    },
    onSuccess: invalidate,
  });
}

export function usePermanentlyDeleteContextFile(
  accessToken: string,
  featureKey: string,
) {
  const invalidate = useInvalidateContext(featureKey);

  return useMutation({
    mutationFn: async (fileKey: string) =>
      permanentlyDeleteContextFile(accessToken, fileKey),
    onSuccess: invalidate,
  });
}

export async function openContextFile(
  accessToken: string,
  file: ContextFile,
): Promise<void> {
  const result = await getContextFileAccessUrl(
    accessToken,
    file.publicKey,
    file.mimeType === 'application/pdf' || file.assetType === 'image'
      ? 'inline'
      : 'attachment',
  );
  window.open(result.url, '_blank', 'noopener,noreferrer');
}
