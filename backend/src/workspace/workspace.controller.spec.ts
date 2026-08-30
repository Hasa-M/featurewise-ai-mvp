import type { CurrentUserContext } from '../auth/current-user-context';
import type { PublicNumber } from '../common/public-identifiers';
import { WorkspaceController } from './workspace.controller';
import type { WorkspaceService } from './workspace.service';

const currentUser: CurrentUserContext = {
  organizationId: '00000000-0000-4000-8000-000000000001',
  organizationKey: 'ORG-12',
  projectId: '00000000-0000-4000-8000-000000000002',
  projectKey: 'PRJ-204',
  userId: '00000000-0000-4000-8000-000000000003',
  userKey: 'USR-7',
  username: 'dev.operator',
};

const response = {
  publicKey: 'PCTX-31',
  projectKey: 'PRJ-204',
  content: 'Shared project rules',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('WorkspaceController', () => {
  it('forwards ProjectContext reads through the Workspace public boundary', async () => {
    const getProjectContext = jest.fn().mockResolvedValue(response);
    const controller = new WorkspaceController({
      getProjectContext,
    } as unknown as WorkspaceService);

    await expect(
      controller.getProjectContext(currentUser, {
        value: 204 as PublicNumber,
      }),
    ).resolves.toBe(response);
    expect(getProjectContext).toHaveBeenCalledWith(currentUser, 204);
  });

  it('forwards only ProjectContext content on updates', async () => {
    const updateProjectContext = jest.fn().mockResolvedValue(response);
    const controller = new WorkspaceController({
      updateProjectContext,
    } as unknown as WorkspaceService);
    const dto = { content: 'Shared project rules' };

    await expect(
      controller.updateProjectContext(
        currentUser,
        { value: 204 as PublicNumber },
        dto,
      ),
    ).resolves.toBe(response);
    expect(updateProjectContext).toHaveBeenCalledWith(currentUser, 204, dto);
  });
});
