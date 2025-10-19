export function parseTeamId(input: string): string | null {
  // Accept either a numeric id or a Figma URL like: https://www.figma.com/files/team/<TEAM_ID>/...
  try {
    const trimmed = input.trim();
    if (/^\d+$/.test(trimmed)) return trimmed;
    const u = new URL(trimmed);
    const segs = u.pathname.split('/').filter(Boolean);
    const idx = segs.indexOf('team');
    if (idx !== -1 && segs[idx + 1]) return segs[idx + 1];
    return null;
  } catch {
    return null;
  }
}
