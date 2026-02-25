export function formatUTC(date: Date): string {
  return date.toISOString().replace('T', ' ').substring(0, 19) + 'Z';
}

export function formatLocal(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour12: false }) + ' LOCAL';
}

export function formatAge(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

export function julianDate(date: Date): number {
  return date.getTime() / 86400000 + 2440587.5;
}
