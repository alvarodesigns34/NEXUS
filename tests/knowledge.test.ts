import { describe, expect, it } from "vitest";
import { emptyWorkspace, newEntry, removeEntry, search, suggest, workspaceSchema } from "../lib/knowledge";
import { chunkSources, hybrid, validateAnswer } from "../lib/retrieval";

describe("knowledge", () => {
  const first = { ...newEntry("note", "Geología y tectónica"), tags: ["Geología"] };
  const second = { ...newEntry("concept", "Subducción", "Geología del manto"), tags: ["geologia"] };
  const workspace = { ...emptyWorkspace, entries: [first, second] };

  it("finds accent-insensitive words and ranks title matches higher", () => {
    expect(search([second, first], "geologia").map(item => item.id)).toEqual([first.id, second.id]);
    expect(search([second, first], "geologia manto").map(item => item.id)).toEqual([second.id]);
  });

  it("proposes relationships for review and prevents duplicate or dangling edges", () => {
    const [edge] = suggest(workspace, first.id);
    expect(edge.status).toBe("pending");
    expect(edge.origin).toBe("suggestion");
    const linked = { ...workspace, relations: [edge] };
    expect(workspaceSchema.safeParse(linked).success).toBe(true);
    expect(suggest(linked, second.id)).toEqual([]);
    const duplicate = { ...edge, id: crypto.randomUUID(), from: second.id, to: first.id };
    expect(workspaceSchema.safeParse({ ...workspace, relations: [edge, duplicate] }).success).toBe(false);
    expect(workspaceSchema.safeParse({ ...linked, entries: [first] }).success).toBe(false);
    expect(removeEntry(linked, second.id).relations).toEqual([]);
  });

  it("rejects unsafe source URLs and duplicate entry IDs", () => {
    expect(workspaceSchema.safeParse({ ...workspace, entries: [first, first] }).success).toBe(false);
    expect(workspaceSchema.safeParse({ ...workspace, entries: [{ ...first, url: "javascript:alert(1)" }] }).success).toBe(false);
  });
});

describe("retrieval", () => {
  const sources = [
    { id: crypto.randomUUID(), title: "Discontinuidades", body: "Moho separa corteza y manto. ".repeat(180) },
    { id: crypto.randomUUID(), title: "Sintaxis", body: "El sujeto concuerda con el verbo." }
  ];
  const chunks = chunkSources(sources);

  it("segments long sources into bounded passages with navigable IDs", () => {
    expect(chunks.length).toBeGreaterThan(3);
    expect(chunks[0].text.length).toBeLessThanOrEqual(1200);
    expect(chunks[0].sourceId).toBe(sources[0].id);
    expect(new Set(chunks.map(chunk => chunk.id)).size).toBe(chunks.length);
  });

  it("ranks keyword and vector agreement and abstains on unmatched queries", () => {
    const vectors = chunks.map(chunk => chunk.title === "Sintaxis" ? [0, 1] : [1, 0]);
    expect(hybrid("moho", chunks, vectors, [1, 0])[0].sourceId).toBe(sources[0].id);
    expect(hybrid("astronomía", chunks, vectors, [-1, -1])).toEqual([]);
  });

  it("rejects invented citations, unreferenced claims, and unapproved general knowledge", () => {
    const block = { kind: "source", text: "El Moho separa la corteza y el manto.", citations: ["S1"] };
    expect(validateAnswer({ blocks: [block] }, chunks, false)).toEqual([block]);
    for (const citations of [["S999"], []]) {
      expect(() => validateAnswer({ blocks: [{ ...block, citations }] }, chunks, false)).toThrow();
    }
    expect(() => validateAnswer({ blocks: [{ kind: "general", text: "General.", citations: [] }] }, chunks, false)).toThrow();
  });
});
