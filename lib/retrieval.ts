import { normalize } from "./knowledge";
import { z } from "zod";

export const sourceSchema = z.object({ id: z.uuid(), title: z.string().min(1).max(160), body: z.string().max(6000) });
export type Source = z.infer<typeof sourceSchema>;
export type Chunk = { id: string; sourceId: string; title: string; text: string };

export function chunkSources(sources: Source[]): Chunk[] {
  return sources.flatMap(source => {
    const body = source.body.trim();
    if (!body) return [{ id: "", sourceId: source.id, title: source.title, text: source.title }];
    const chunks: Chunk[] = [];
    for (let start = 0; start < body.length;) {
      const end = Math.min(start + 1200, body.length);
      const breakAt = body.lastIndexOf(" ", end);
      const stop = end === body.length || breakAt < start + 850 ? end : breakAt;
      chunks.push({ id: "", sourceId: source.id, title: source.title, text: body.slice(start, stop).trim() });
      if (stop >= body.length) break;
      start = stop - 140;
    }
    return chunks;
  }).map((chunk, index) => ({ ...chunk, id: `S${index + 1}` }));
}

function tokens(text: string) {
  return new Set(normalize(text).match(/[\p{L}\p{N}]{3,}/gu) ?? []);
}

function cosine(a: number[], b: number[]) {
  let dot = 0, aa = 0, bb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; aa += a[i] ** 2; bb += b[i] ** 2; }
  return aa && bb ? dot / Math.sqrt(aa * bb) : -1;
}

export function hybrid(question: string, chunks: Chunk[], vectors: number[][], queryVector: number[]) {
  const terms = tokens(question);
  const candidates = chunks.map((chunk, index) => {
    const title = tokens(chunk.title), body = tokens(chunk.text);
    let lexical = 0;
    for (const term of terms) lexical += title.has(term) ? 3 : body.has(term) ? 1 : 0;
    return { chunk, lexical, semantic: cosine(vectors[index], queryVector) };
  });
  const words = candidates.filter(item => item.lexical > 0).sort((a, b) => b.lexical - a.lexical);
  const semantic = candidates.filter(item => item.semantic >= 0.38).sort((a, b) => b.semantic - a.semantic);
  const scores = new Map<Chunk, number>();
  for (const list of [words, semantic]) list.forEach(({ chunk }, index) => scores.set(chunk, (scores.get(chunk) ?? 0) + 1 / (20 + index)));
  return [...scores].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([chunk]) => chunk);
}

const answerSchema = z.object({
  blocks: z.array(z.object({ kind: z.enum(["source", "inference", "general", "unknown"]), text: z.string().trim().min(1).max(2200), citations: z.array(z.string()).max(6) })).min(1).max(8)
});
export type AnswerBlock = z.infer<typeof answerSchema>["blocks"][number];

export function validateAnswer(value: unknown, context: Chunk[], allowGeneral: boolean) {
  const answer = answerSchema.parse(value);
  const known = new Set(context.map(chunk => chunk.id));
  for (const block of answer.blocks) {
    if (block.kind === "general" && !allowGeneral) throw new Error("Unexpected general answer");
    if (block.citations.some(id => !known.has(id))) throw new Error("Invalid citation");
    const grounded = block.kind === "source" || block.kind === "inference";
    if (grounded !== Boolean(block.citations.length)) throw new Error("Unexpected citation state");
  }
  return answer.blocks;
}
