export function githubConnectionError(code: string | null): string | null {
  if (!code) return null;
  switch (code) {
    case 'installation_required':
      return 'Install the GitHub App on your account or organization, grant access to the repositories you want to connect, then return here to continue.';
    case 'permissions_required':
      return 'The GitHub App installation needs Contents: read-only access. Ask the App owner to enable it, then approve the updated permissions in GitHub and reconnect.';
    case 'authorization_denied':
      return 'GitHub authorization was cancelled. You can try connecting again.';
    case 'expired_or_replayed':
    case 'replayed':
      return 'This connection attempt expired or was already used. Start a new connection.';
    default:
      return 'GitHub authorization could not be completed. Start a new connection and authorize the GitHub App.';
  }
}
