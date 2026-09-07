import type { ConfigService } from '@nestjs/config';
import { GitHubRepositoryAdapter } from './github-repository.adapter';

function fixture(contents: string | undefined = 'read') {
  const request = jest
    .fn()
    .mockResolvedValue({ data: { permissions: { contents } } });
  const userRequest = jest
    .fn()
    .mockResolvedValue({ data: { installations: [] } });
  const authorization = jest
    .fn()
    .mockReturnValue({ url: 'https://github.test/authorize' });
  const exchange = jest.fn().mockResolvedValue({ request: userRequest });
  const getInstallationUrl = jest
    .fn()
    .mockResolvedValue('https://github.test/install');
  const adapter = new GitHubRepositoryAdapter({
    getOrThrow: () => ({
      enabled: true,
      callbackUrl: 'http://localhost:3000/integrations/github/callback',
    }),
  } as unknown as ConfigService);
  Reflect.set(
    adapter,
    'appPromise',
    Promise.resolve({
      octokit: { request },
      getInstallationUrl,
      oauth: {
        getWebFlowAuthorizationUrl: authorization,
        getUserOctokit: exchange,
      },
    }),
  );
  return {
    adapter,
    request,
    userRequest,
    authorization,
    exchange,
    getInstallationUrl,
  };
}

describe('GitHub connection adapter', () => {
  it.each(['none', 'write'])(
    'rejects incorrect Contents permission (%s) before redirecting',
    async (permission) => {
      const f = fixture(permission);
      await expect(
        f.adapter.createUserAuthorizationUrl('state'),
      ).rejects.toThrow('Contents: read-only');
      await expect(f.adapter.createInstallationUrl('state')).rejects.toThrow(
        'Contents: read-only',
      );
      expect(f.authorization).not.toHaveBeenCalled();
      expect(f.getInstallationUrl).not.toHaveBeenCalled();
    },
  );

  it('uses the registered callback for authorization and token exchange', async () => {
    const f = fixture();
    await f.adapter.createUserAuthorizationUrl('state');
    await f.adapter.verifyUserInstallation('code');
    const redirectUrl = 'http://localhost:3000/integrations/github/callback';
    expect(f.authorization).toHaveBeenCalledWith({
      state: 'state',
      redirectUrl,
    });
    expect(f.exchange).toHaveBeenCalledWith({ code: 'code', redirectUrl });
  });

  it('uses only user-visible, active installations with Contents read access', async () => {
    const f = fixture();
    f.userRequest.mockResolvedValueOnce({
      data: {
        installations: [
          {
            id: 1,
            account: { login: 'personal' },
            permissions: { contents: 'read' },
            suspended_at: null,
          },
          {
            id: 2,
            account: { login: 'org' },
            permissions: { contents: 'read' },
            suspended_at: null,
          },
          {
            id: 3,
            permissions: { contents: 'read' },
            suspended_at: '2026-09-01',
          },
          { id: 4, permissions: {}, suspended_at: null },
        ],
      },
    });
    expect(await f.adapter.verifyUserInstallation('code')).toEqual([
      { installationId: '1', accountLogin: 'personal' },
      { installationId: '2', accountLogin: 'org' },
    ]);
  });

  it('reports an installed App whose permission update has not been approved', async () => {
    const f = fixture();
    f.userRequest.mockResolvedValueOnce({
      data: { installations: [{ id: 1, permissions: {}, suspended_at: null }] },
    });
    await expect(f.adapter.verifyUserInstallation('code')).rejects.toThrow(
      'Approve Contents: read-only',
    );
  });

  it('does not trust a spoofed installation ID from a callback', async () => {
    const f = fixture();
    await expect(
      f.adapter.verifyUserInstallation('code', '999'),
    ).rejects.toThrow('not visible');
  });
});
