import { NextResponse } from "next/server";
import { askBedrockForCode } from "@/app/lib/bedrock/generate";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { ok: false, error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const brief = body?.brief;
    if (!brief) {
      return NextResponse.json(
        { ok: false, error: "Missing 'brief' in body" },
        { status: 400 }
      );
    }

    const code = await askBedrockForCode(brief);

    return NextResponse.json({
      ok: true,
      results: [{ name: brief?.name ?? "Component", code }],
    });
  } catch (err: any) {
    const msg = String(err?.message || err);
    console.error("[bedrock/generate] error:", msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
