import { createHash } from "node:crypto";
import { z } from "zod";
import { answer, embed, embeddingModel, vectorSchema } from "../../../lib/mistral";
import { chunkSources, hybrid, sourceSchema } from "../../../lib/retrieval";
import { readJson, sameOrigin, supabase } from "../../../lib/supabase";

export const maxDuration = 60;
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
const input = z.object({
  consent: z.literal(true), question: z.string().trim().min(3).max(700), locale: z.enum(["es", "en"]), allowGeneral: z.boolean(),
  sources: z.array(sourceSchema).min(1).max(6)
}).refine(value => new Set(value.sources.map(source => source.id)).size === value.sources.length);

export async function GET() {
  const client = await supabase();
  if (!client) return json({ enabled: false, signedIn: false });
  const { data: { user } } = await client.auth.getUser();
  return json({ enabled: Boolean(process.env.MISTRAL_API_KEY), signedIn: Boolean(user) });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ error: "origin" }, 403);
  const client = await supabase();
  if (!client || !process.env.MISTRAL_API_KEY) return json({ error: "unavailable" }, 503);
  const { data: { user } } = await client.auth.getUser();
  if (!user) return json({ error: "auth" }, 401);
  const checked = input.safeParse(await readJson(request, 260_000).catch(() => null));
  if (!checked.success) return json({ error: "input" }, 400);
  const { question, locale, allowGeneral, sources } = checked.data;
  const { data: quota, error: quotaError } = await client.rpc("nexus_reserve_ai");
  if (quotaError) return json({ error: "storage" }, 503);
  if (!quota) return json({ error: "quota" }, 429);

  try {
    const chunks = chunkSources(sources);
    const texts = chunks.map(chunk => chunk.title + "\n" + chunk.text);
    const keys = texts.map(text => createHash("sha256").update(embeddingModel + "\0" + text).digest("hex"));
    const { data: existing, error } = await client.from("nexus_embeddings").select("hash, embedding").eq("owner", user.id).in("hash", [...new Set(keys)]);
    if (error) return json({ error: "storage" }, 503);
    const vectors = new Map<string, number[]>();
    for (const row of existing ?? []) {
      const vector = vectorSchema.safeParse(typeof row.embedding === "string" ? JSON.parse(row.embedding) : row.embedding);
      if (vector.success) vectors.set(row.hash, vector.data);
    }
    const missing = [...new Map(keys.map((key, index) => [key, texts[index]])).entries()].filter(([key]) => !vectors.has(key));
    const [queryVector, ...newVectors] = await embed([question, ...missing.map(([, text]) => text)]);
    const rows = missing.map(([hash], index) => {
      vectors.set(hash, newVectors[index]);
      return { owner: user.id, hash, embedding: JSON.stringify(newVectors[index]) };
    });
    if (rows.length) await client.from("nexus_embeddings").upsert(rows, { onConflict: "owner,hash", ignoreDuplicates: true });
    const context = hybrid(question, chunks, keys.map(key => vectors.get(key)!), queryVector);
    if (!context.length && !allowGeneral) return json({
      blocks: [{ kind: "unknown", citations: [], text: locale === "es" ? "No encontré fragmentos que respalden una respuesta en las fuentes seleccionadas." : "I found no passages supporting an answer in the selected sources." }], sources: []
    });
    const blocks = await answer(question, context, locale, allowGeneral);
    const ids = new Set(blocks.flatMap(block => block.citations));
    return json({ blocks, sources: context.filter(chunk => ids.has(chunk.id)) });
  } catch { return json({ error: "provider" }, 502); }
}
