import { request } from '@/shared/api';

export type ContextFileStatus =
  | 'pending_upload'
  | 'processing'
  | 'ready'
  | 'failed';

export interface ContextFileDto {
  readonly assetType: 'image' | 'file';
  readonly canDeletePermanently: boolean;
  readonly createdAt: string;
  readonly failure: {
    readonly code: string;
    readonly message: string | null;
  } | null;
  readonly filename: string;
  readonly mimeType: string;
  readonly publicKey: string;
  readonly readyAt: string | null;
  readonly selected: boolean;
  readonly sizeBytes: number;
  readonly status: ContextFileStatus;
  readonly updatedAt: string;
}

export interface ContextDto {
  readonly content: string;
  readonly createdAt: string;
  readonly featureKey: string;
  readonly files: readonly ContextFileDto[];
  readonly publicKey: string;
  readonly updatedAt: string;
}

export interface ProjectContextDto {
  readonly content: string;
  readonly createdAt: string;
  readonly projectKey: string;
  readonly publicKey: string;
  readonly updatedAt: string;
}

export interface PresignedUploadDto {
  readonly file: ContextFileDto;
  readonly upload: {
    readonly expiresAt: string;
    readonly fields: Readonly<Record<string, string>>;
    readonly url: string;
  };
}

export interface ArchiveDto {
  readonly files: readonly ContextFileDto[];
  readonly nextCursor: string | null;
}

export function getFeatureContext(
  accessToken: string,
  featureKey: string,
): Promise<ContextDto> {
  return request<ContextDto>(`/features/${featureKey}/context`, { accessToken });
}

export function updateFeatureContext(
  accessToken: string,
  featureKey: string,
  content: string,
): Promise<ContextDto> {
  return request<ContextDto>(`/features/${featureKey}/context`, {
    accessToken,
    body: { content },
    method: 'PATCH',
  });
}

export function getProjectContext(
  accessToken: string,
  projectKey: string,
): Promise<ProjectContextDto> {
  return request<ProjectContextDto>(`/projects/${projectKey}/context`, {
    accessToken,
  });
}

export function updateProjectContext(
  accessToken: string,
  projectKey: string,
  content: string,
): Promise<ProjectContextDto> {
  return request<ProjectContextDto>(`/projects/${projectKey}/context`, {
    accessToken,
    body: { content },
    method: 'PATCH',
  });
}

export function createFeatureContextFile(
  accessToken: string,
  featureKey: string,
  input: {
    readonly checksumSha256: string;
    readonly filename: string;
    readonly mimeType: string;
    readonly sizeBytes: number;
  },
): Promise<PresignedUploadDto> {
  return request<PresignedUploadDto>(`/features/${featureKey}/context/files`, {
    accessToken,
    body: input,
    method: 'POST',
  });
}

export function confirmContextFile(
  accessToken: string,
  storageObjectKey: string,
): Promise<ContextFileDto> {
  return request<ContextFileDto>(
    `/storage-objects/${storageObjectKey}/confirm`,
    { accessToken, method: 'POST' },
  );
}

export function getFeatureContextArchive(
  accessToken: string,
  featureKey: string,
  query = '',
): Promise<ArchiveDto> {
  const search = new URLSearchParams();
  if (query.trim()) search.set('query', query.trim());
  search.set('limit', '20');

  return request<ArchiveDto>(
    `/features/${featureKey}/context/files/archive?${search.toString()}`,
    { accessToken },
  );
}

export function updateContextFileSelection(
  accessToken: string,
  storageObjectKey: string,
  selected: boolean,
): Promise<ContextFileDto> {
  return request<ContextFileDto>(
    `/storage-objects/${storageObjectKey}/selection`,
    { accessToken, body: { selected }, method: 'PATCH' },
  );
}

export function getContextFileAccessUrl(
  accessToken: string,
  storageObjectKey: string,
  disposition: 'inline' | 'attachment',
): Promise<{ readonly disposition: string; readonly expiresAt: string; readonly url: string }> {
  return request(
    `/storage-objects/${storageObjectKey}/access-url?disposition=${disposition}`,
    { accessToken },
  );
}

export function permanentlyDeleteContextFile(
  accessToken: string,
  storageObjectKey: string,
): Promise<void> {
  return request<void>(`/storage-objects/${storageObjectKey}`, {
    accessToken,
    method: 'DELETE',
  });
}

export function uploadFileToPresignedPost(
  upload: PresignedUploadDto['upload'],
  file: File,
  onProgress: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    const form = new FormData();

    Object.entries(upload.fields).forEach(([key, value]) => form.append(key, value));
    form.append('file', file);
    request.open('POST', upload.url);
    request.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    });
    request.addEventListener('load', () => {
      if (request.status >= 200 && request.status < 300) resolve();
      else reject(new Error(`S3 upload failed with status ${request.status}`));
    });
    request.addEventListener('error', () => reject(new Error('S3 upload failed')));
    request.addEventListener('abort', () => reject(new Error('S3 upload was cancelled')));
    request.send(form);
  });
}
