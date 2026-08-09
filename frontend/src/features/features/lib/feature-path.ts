export function getFeaturePath(
  projectPublicKey: string,
  featurePublicKey: string,
): string {
  return `/projects/${encodeURIComponent(projectPublicKey)}/features/${encodeURIComponent(featurePublicKey)}`;
}
