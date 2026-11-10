import { z } from "zod";
import { kinds, predicates } from "./knowledge";

const draftSchema = z.object({
  kind: z.enum(kinds), title: z.string().max(160), body: z.string().max(60000),
  url: z.string().max(2000), pinned: z.boolean(), tags: z.string().max(500),
  target: z.string(), predicate: z.enum(predicates)
});

export function readDraft(key: string) {
  try {
    return draftSchema.parse(JSON.parse(sessionStorage.getItem(key) ?? "null"));
  } catch { return null; }
}

export function storeDraft(key: string, draft?: z.infer<typeof draftSchema>) {
  try {
    if (draft) sessionStorage.setItem(key, JSON.stringify(draft));
    else sessionStorage.removeItem(key);
  } catch { /* The editor still works when storage is unavailable. */ }
}
