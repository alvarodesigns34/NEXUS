import { z } from "zod";

export const kinds = ["note", "idea", "project", "concept", "person", "link", "file", "collection"] as const;
export type Kind = (typeof kinds)[number];
export const predicates = ["relates", "belongs", "supports", "depends", "mentions"] as const;
export type Predicate = (typeof predicates)[number];
const id = z.uuid();
const stamp = z.iso.datetime();
const webUrl = z.url({ protocol: /^https?$/ });
const entrySchema = z.object({
  id, kind: z.enum(kinds), title: z.string().trim().min(1).max(160),
  body: z.string().max(60000), tags: z.array(z.string().trim().min(1).max(40)).max(12),
  url: z.union([webUrl.max(2000), z.literal("")]), pinned: z.boolean(),
  createdAt: stamp, updatedAt: stamp,
  history: z.array(z.object({ title: z.string().max(160), body: z.string().max(60000), at: stamp })).max(5)
});
const relationSchema = z.object({
  id, from: id, to: id, predicate: z.enum(predicates),
  origin: z.enum(["manual", "suggestion"]), status: z.enum(["accepted", "pending", "dismissed"])
}).refine(edge => edge.from !== edge.to && (edge.origin === "suggestion" || edge.status === "accepted"));

export type Entry = z.infer<typeof entrySchema>;
export type Relation = z.infer<typeof relationSchema>;
export const workspaceSchema = z.object({
  version: z.literal(1), entries: z.array(entrySchema).max(2000),
  relations: z.array(relationSchema).max(6000)
}).superRefine((workspace, ctx) => {
  const entries = new Set(workspace.entries.map(entry => entry.id));
  if (entries.size !== workspace.entries.length) ctx.addIssue({ code: "custom", message: "Duplicate entry IDs" });
  const ids = new Set<string>();
  const keys = new Set<string>();
  for (const edge of workspace.relations) {
    const key = relationKey(edge);
    if (ids.has(edge.id) || keys.has(key) || !entries.has(edge.from) || !entries.has(edge.to)) {
      ctx.addIssue({ code: "custom", message: "Invalid or duplicate relation" });
      break;
    }
    keys.add(key);
    ids.add(edge.id);
  }
});
export type Workspace = z.infer<typeof workspaceSchema>;

export const emptyWorkspace: Workspace = { version: 1, entries: [], relations: [] };
export function newEntry(kind: Kind, title: string, body = ""): Entry {
  const now = new Date().toISOString();
  return { id: crypto.randomUUID(), kind, title, body, tags: [], url: "", pinned: false, createdAt: now, updatedAt: now, history: [] };
}

export function normalize(value: string) {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase();
}

export function search(entries: Entry[], query: string): Entry[] {
  const words = normalize(query.trim()).split(/\s+/).filter(Boolean);
  if (!words.length) return [...entries].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return entries.map(entry => {
    const title = normalize(entry.title);
    const tags = normalize(entry.tags.join(" "));
    const body = normalize(entry.body + " " + entry.url);
    const weights = words.map(word => title.includes(word) ? 8 : tags.includes(word) ? 4 : body.includes(word) ? 1 : 0);
    return { entry, score: weights.every(Boolean) ? weights.reduce<number>((a, b) => a + b, 0) : 0 };
  }).filter(result => result.score > 0).sort((a, b) => b.score - a.score || b.entry.updatedAt.localeCompare(a.entry.updatedAt)).map(result => result.entry);
}

export function relationKey(edge: Pick<Relation, "from" | "to" | "predicate">) {
  const endpoints = edge.predicate === "relates" ? [edge.from, edge.to].sort() : [edge.from, edge.to];
  return [...endpoints, edge.predicate].join(":");
}

export function suggest(workspace: Workspace, id: string): Relation[] {
  const entry = workspace.entries.find(item => item.id === id);
  if (!entry || !entry.tags.length) return [];
  const tags = new Set(entry.tags.map(normalize));
  const existing = new Set(workspace.relations.map(relationKey));
  return workspace.entries.filter(item => item.id !== id && item.tags.some(tag => tags.has(normalize(tag))))
    .map<Relation>(item => ({ id: crypto.randomUUID(), from: id, to: item.id, predicate: "relates", origin: "suggestion", status: "pending" }))
    .filter(edge => !existing.has(relationKey(edge))).slice(0, 10);
}

export function removeEntry(workspace: Workspace, id: string): Workspace {
  return { ...workspace, entries: workspace.entries.filter(entry => entry.id !== id),
    relations: workspace.relations.filter(edge => edge.from !== id && edge.to !== id) };
}
