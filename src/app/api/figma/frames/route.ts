// src/app/api/figma/frames/route.ts
import { NextRequest, NextResponse } from 'next/server';

type FigmaNode = {
  id: string;
  name: string;
  type: string;
  children?: FigmaNode[];
  absoluteBoundingBox?: { x: number; y: number; width: number; height: number };
};

type FrameOut = {
  id: string;             // "12:345"
  idDash: string;         // "12-345" (for URLs)
  name: string;
  page: string;
  type: string;           // FRAME
  w?: number;
  h?: number;
  url: string;            // https://www.figma.com/design/{fileKey}/?node-id=12-345
};

function walkFrames(node: FigmaNode, page: string, out: FrameOut[], fileKey: string) {
  const isFrame = node.type === 'FRAME';
  if (isFrame) {
    const idDash = node.id.replace(':', '-');
    out.push({
      id: node.id,
      idDash,
      name: node.name,
      page,
      type: node.type,
      w: node.absoluteBoundingBox?.width,
      h: node.absoluteBoundingBox?.height,
      url: `https://www.figma.com/design/${fileKey}/?node-id=${idDash}`,
    });
  }
  if (node.children) {
    for (const c of node.children) {
      walkFrames(c, page, out, fileKey);
    }
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fileKey = searchParams.get('fileKey');
    if (!fileKey) {
      return NextResponse.json({ status: 400, err: 'fileKey is required' }, { status: 400 });
    }

    // Read token from Authorization header (client will set "Authorization: Bearer <token>")
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.toLowerCase().startsWith('bearer ')
      ? authHeader.slice(7)
      : '';

    if (!token) {
      return NextResponse.json({ status: 401, err: 'Missing bearer token' }, { status: 401 });
    }

    // Call Figma: full file tree
    const resp = await fetch(`https://api.figma.com/v1/files/${fileKey}`, {
      headers: { Authorization: `Bearer ${token}` },
      // NOTE: no scopes needed beyond a file the user can access. "file_content:read" covers this file endpoint.
    });

    if (!resp.ok) {
      const t = await resp.text().catch(() => '');
      return NextResponse.json({ status: resp.status, err: t || resp.statusText }, { status: resp.status });
    }

    const data = await resp.json();
    const pages: FigmaNode[] = data.document?.children ?? [];

    const out: FrameOut[] = [];
    for (const page of pages) {
      const pageName = page.name || 'Untitled';
      if (page.children) {
        for (const child of page.children) {
          walkFrames(child, pageName, out, fileKey);
        }
      }
    }

    return NextResponse.json({ status: 200, frames: out });
  } catch (e: any) {
    return NextResponse.json({ status: 500, err: e?.message || 'Unexpected error' }, { status: 500 });
  }
}
