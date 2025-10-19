// src/app/lib/figmaFramesClient.ts
import { extractFileKey } from './figmaUrl';

export type ListedFrame = {
  id: string;
  idDash: string;
  name: string;
  page: string;
  type: string;
  w?: number;
  h?: number;
  url: string;
};

export async function listFramesForFile(inputUrlOrKey: string): Promise<ListedFrame[]> {
  const fileKey = extractFileKey(inputUrlOrKey);
  if (!fileKey) throw new Error('Could not find a file key in that input.');

  const tokRaw = sessionStorage.getItem('figma_token');
  if (!tokRaw) throw new Error('No Figma token in session. Connect first.');
  const tok = JSON.parse(tokRaw);
  const accessToken: string = tok.access_token;

  const r = await fetch(`/api/figma/frames?fileKey=${encodeURIComponent(fileKey)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const j = await r.json();
  if (!r.ok) throw new Error(j?.err || r.statusText);
  return j.frames ?? [];
}
