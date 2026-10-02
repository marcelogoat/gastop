import { NextResponse } from "next/server";
import { blackcat } from "../../../../lib/blackcat";

export const dynamic = "force-dynamic";

export async function GET(req) {
  const id = String(new URL(req.url).searchParams.get("id") || "").trim();
  if (!id) {
    return NextResponse.json({ success: false, message: "id obrigatório" }, { status: 400 });
  }
  const { status, data } = await blackcat("GET", "/sales/" + encodeURIComponent(id) + "/status");
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
