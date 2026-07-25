export const PUBLIC_ROOT_SEGMENTS = [
  'login',
  'register',
  'forgot-password',
  'select-workspace',
  'verify-email',
  'reset-password',
  'join',
];

export function getSlugFromPath(pathname = window.location.pathname) {
  const first = pathname.split('/').filter(Boolean)[0];
  if (!first || PUBLIC_ROOT_SEGMENTS.includes(first)) return null;
  return first;
}

export function withWorkspaceSlug(path, slug) {
  if (!slug) return path;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  if (normalized === `/${slug}` || normalized.startsWith(`/${slug}/`)) {
    return normalized;
  }
  return `/${slug}${normalized}`;
}

export function stripWorkspaceSlug(pathname, slug) {
  if (!slug) return pathname;
  const prefix = `/${slug}`;
  if (pathname === prefix) return '/';
  if (pathname.startsWith(`${prefix}/`)) {
    return pathname.slice(prefix.length) || '/';
  }
  return pathname;
}
