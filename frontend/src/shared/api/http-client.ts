import { env } from '@/shared/config/env';

import { ApiError } from './api-error';

export interface RequestOptions
  extends Omit<RequestInit, 'body' | 'headers'> {
  accessToken?: string;
  body?: unknown;
  headers?: HeadersInit;
}

function createUrl(path: string): string {
  return `${env.apiBaseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}

async function parseBody(response: Response): Promise<unknown> {
  const text = await response.text();

  if (!text) {
    return undefined;
  }

  const contentType = response.headers.get('content-type');
  return contentType?.includes('application/json') ? JSON.parse(text) : text;
}

function getErrorMessage(body: unknown, status: number): string {
  if (typeof body === 'object' && body !== null && 'message' in body) {
    const message = (body as { message?: unknown }).message;

    if (typeof message === 'string') {
      return message;
    }

    if (Array.isArray(message) && message.every((item) => typeof item === 'string')) {
      return message.join(', ');
    }
  }

  return `Request failed with status ${status}`;
}

export async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { accessToken, body, headers: customHeaders, ...init } = options;
  const headers = new Headers(customHeaders);

  headers.set('Accept', 'application/json');

  if (body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const response = await fetch(createUrl(path), {
    ...init,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const responseBody = await parseBody(response);

  if (!response.ok) {
    throw new ApiError(
      getErrorMessage(responseBody, response.status),
      response.status,
      responseBody,
    );
  }

  return responseBody as T;
}
