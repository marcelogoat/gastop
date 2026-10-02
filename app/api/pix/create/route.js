import { NextResponse } from "next/server";
import { blackcat } from "../../../../lib/blackcat";

export const dynamic = "force-dynamic";

export async function POST(req) {
  let payload = {};
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ success: false, message: "JSON inválido" }, { status: 400 });
  }
  const { status, data } = await blackcat("POST", "/sales/create-sale", payload);
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
