export function parseTtl(
  raw: string | undefined,
  fallbackSeconds: number,
): number {
  if (!raw) return fallbackSeconds;
  const match = raw.trim().match(/^(\d+)([smhd])?$/i);
  if (!match) return fallbackSeconds;
  const value = Number(match[1]);
  switch ((match[2] || '').toLowerCase()) {
    case 'm':
      return value * 60;
    case 'h':
      return value * 3600;
    case 'd':
      return value * 86400;
    case 's':
      return value;
    default:
      return value;
  }
}
