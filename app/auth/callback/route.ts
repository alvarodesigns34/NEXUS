import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const target = new URL("/", process.env.NEXUS_SITE_URL || url.origin);
  const code = url.searchParams.get("code");
  const client = await supabase();
  if (!client || !code || (await client.auth.exchangeCodeForSession(code)).error) target.searchParams.set("auth", "error");
  else target.searchParams.set("auth", "connected");
  return NextResponse.redirect(target);
}
