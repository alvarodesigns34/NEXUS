import { z } from "zod";
import { workspaceSchema } from "../../../lib/knowledge";
import { readJson, sameOrigin, supabase } from "../../../lib/supabase";

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("login"), email: z.email().max(254) }),
  z.object({ action: z.literal("logout") }),
  z.object({ action: z.literal("clear-ai") }),
  z.object({ action: z.literal("delete"), revision: z.number().int().min(1) }),
  z.object({ action: z.literal("backup"), revision: z.number().int().min(0), workspace: workspaceSchema })
]);

export async function GET() {
  const client = await supabase();
  if (!client) return json({ available: false }, 503);
  const { data: { user } } = await client.auth.getUser();
  if (!user) return json({ signedIn: false });
  const { data, error } = await client.from("nexus_backups").select("revision, workspace, updated_at").eq("owner", user.id).maybeSingle();
  if (error) return json({ error: "storage" }, 500);
  return json({ signedIn: true, email: user.email, revision: data?.revision ?? 0, workspace: data?.workspace ?? null, updatedAt: data?.updated_at ?? null });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ error: "origin" }, 403);
  const client = await supabase();
  if (!client) return json({ error: "unavailable" }, 503);
  const body = actionSchema.safeParse(await readJson(request, 3_000_000).catch(() => null));
  if (!body.success) return json({ error: "input" }, 400);
  const action = body.data;
  if (action.action === "login") {
    const redirect = new URL("/auth/callback", process.env.NEXUS_SITE_URL || request.url);
    const { error } = await client.auth.signInWithOtp({ email: action.email, options: { emailRedirectTo: redirect.toString() } });
    return error ? json({ error: "email" }, 400) : json({ ok: true });
  }
  if (action.action === "logout") {
    const { error } = await client.auth.signOut({ scope: "local" });
    return error ? json({ error: "session" }, 400) : json({ ok: true });
  }
  const { data: { user } } = await client.auth.getUser();
  if (!user) return json({ error: "auth" }, 401);
  if (action.action === "clear-ai") {
    const { error } = await client.from("nexus_embeddings").delete().eq("owner", user.id);
    return error ? json({ error: "storage" }, 500) : json({ ok: true });
  }
  const { data, error } = await client.rpc("nexus_write_backup", {
    expected_revision: action.revision,
    next_workspace: action.action === "backup" ? action.workspace : null
  });
  if (error) return json({ error: "storage" }, 500);
  if (data === null) return json({ error: "conflict" }, 409);
  return json({ ok: true, revision: data });
}
