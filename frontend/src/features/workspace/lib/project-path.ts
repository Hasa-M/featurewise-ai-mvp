export function getProjectPath(projectPublicKey: string): string {
  return `/projects/${encodeURIComponent(projectPublicKey)}`;
}
