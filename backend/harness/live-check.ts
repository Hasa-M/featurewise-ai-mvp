import { createHash } from 'node:crypto';
import { join } from 'node:path';
import sharp from 'sharp';
import type { HarnessSettings } from './environment';
import { artifactDirectory, exportCapture, saveJson } from './inspection';
import { createHarnessApplication } from './application';

export async function liveCheck(settings: HarnessSettings, args: string[]) {
  const directory = artifactDirectory('live-check');
  const checks: {
    name: string;
    status: 'passed' | 'failed' | 'not_run';
    detail: string;
  }[] = [];
  const persist = () => saveJson(join(directory, 'result.json'), { checks });
  if (process.env.HARNESS_MODE !== 'live') {
    checks.push({
      name: 'live providers',
      status: 'not_run',
      detail:
        'Configure .harness/live.env, start harness:up -- --live, then run harness:live-check -- --live --feature FEAT-<number>.',
    });
    persist();
    console.log(directory);
    return;
  }
  const featureKey = args[args.indexOf('--feature') + 1];
  if (!args.includes('--feature') || !featureKey?.startsWith('FEAT-'))
    throw new Error('Live check requires --feature FEAT-<number>');
  const base = 'http://127.0.0.1:3100';
  const control = await fetch('http://127.0.0.1:3199', {
    headers: { Authorization: `Bearer ${settings.tokenSecret}` },
  });
  const state = (await control.json()) as { providerMode: string };
  if (state.providerMode !== 'live')
    throw new Error('Running harness is not in live mode');
  let token = '';
  const api = async <T>(
    path: string,
    method = 'GET',
    body?: unknown,
  ): Promise<T> => {
    const response = await fetch(base + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok)
      throw new Error(
        `Live HTTP check failed: ${method} ${path} (${response.status})`,
      );
    return response.json() as Promise<T>;
  };
  try {
    const login = await api<{
      accessToken: string;
      user: { projectKey: string };
    }>('/auth/login', 'POST', {
      username: 'harness.operator',
      password: settings.operatorPassword,
    });
    token = login.accessToken;
    const repository = await api<{ state: string }>(
      `/projects/${login.user.projectKey}/repository`,
    );
    checks.push({
      name: 'GitHub connection',
      status: repository.state === 'connected' ? 'passed' : 'not_run',
      detail:
        repository.state === 'connected'
          ? 'Existing authorized test connection observed; capture below verifies retrieval.'
          : 'Complete GitHub OAuth and repository selection in Chrome first.',
    });
    if (
      process.env.S3_BUCKET &&
      (process.env.AWS_PROFILE || process.env.AWS_ACCESS_KEY_ID)
    ) {
      const fixtures = [
        {
          filename: 'harness-smoke.txt',
          mimeType: 'text/plain',
          bytes: Buffer.from(
            'Live harness upload: specification edits persist.\n',
          ),
        },
        {
          filename: 'harness-smoke.png',
          mimeType: 'image/png',
          bytes: await sharp({
            create: {
              width: 32,
              height: 32,
              channels: 3,
              background: '#336699',
            },
          })
            .png()
            .toBuffer(),
        },
        {
          filename: 'harness-smoke.rtf',
          mimeType: 'application/rtf',
          bytes: Buffer.from(
            '{\\rtf1\\ansi Harness document conversion: specification edits persist.}',
          ),
        },
      ];
      for (const { filename, mimeType, bytes } of fixtures) {
        const upload = await api<{
          file: { publicKey: string };
          upload: { url: string; fields: Record<string, string> };
        }>(`/features/${featureKey}/context/files`, 'POST', {
          filename,
          mimeType,
          sizeBytes: bytes.length,
          checksumSha256: createHash('sha256').update(bytes).digest('base64'),
        });
        const form = new FormData();
        for (const [name, value] of Object.entries(upload.upload.fields))
          form.append(name, value);
        form.append(
          'file',
          new Blob([new Uint8Array(bytes)], { type: mimeType }),
          filename,
        );
        const response = await fetch(upload.upload.url, {
          method: 'POST',
          body: form,
          signal: AbortSignal.timeout(30000),
        });
        if (!response.ok)
          throw new Error(`S3 upload failed (${response.status})`);
        await api(`/storage-objects/${upload.file.publicKey}/confirm`, 'POST');
        let ready = false;
        for (let attempt = 0; attempt < 60; attempt++) {
          const context = await api<{
            files: { publicKey: string; status: string }[];
          }>(`/features/${featureKey}/context`);
          const file = context.files.find(
            (item) => item.publicKey === upload.file.publicKey,
          );
          if (file?.status === 'ready') {
            ready = true;
            break;
          }
          if (file?.status === 'failed')
            throw new Error('Live file preparation failed');
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        if (!ready) throw new Error('Live file preparation timed out');
        checks.push({
          name: `S3 upload and preparation: ${filename}`,
          status: 'passed',
          detail: upload.file.publicKey,
        });
      }
    } else
      checks.push({
        name: 'S3 upload',
        status: 'not_run',
        detail: 'Explicit AWS profile/credentials and bucket required',
      });
    const { app } = await createHarnessApplication();
    try {
      const result = await exportCapture(
        app,
        settings,
        login.user.projectKey,
        featureKey,
        true,
      );
      checks.push({
        name: 'Capture and exact-version retrieval',
        status: 'passed',
        detail: result.directory,
      });
      if (repository.state === 'connected' && !result.snapshot.repository)
        throw new Error('Connected repository missing from snapshot');
    } finally {
      await app.close();
    }
    checks.push({
      name: 'Interactive OAuth consent and browser workflows',
      status: 'not_run',
      detail:
        'Verify interactively in Chrome using the runbook; HTTP checks do not verify browser behavior.',
    });
  } catch (error) {
    checks.push({
      name: 'Live execution',
      status: 'failed',
      detail: error instanceof Error ? error.name : 'unknown',
    });
    throw error;
  } finally {
    persist();
    console.log(directory);
  }
}
