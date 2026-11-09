import type { Kind, Predicate } from "./knowledge";

export type Locale = "es" | "en";
export const labels: Record<Locale, Record<Kind, string>> = {
  es: { note: "Nota", idea: "Idea", project: "Proyecto", concept: "Concepto", person: "Persona", link: "Enlace", file: "Archivo", collection: "Colección" },
  en: { note: "Note", idea: "Idea", project: "Project", concept: "Concept", person: "Person", link: "Link", file: "File", collection: "Collection" }
};
export const relationship: Record<Locale, Record<Predicate, string>> = {
  es: { relates: "Se relaciona con", belongs: "Pertenece a", supports: "Respalda", depends: "Depende de", mentions: "Menciona" },
  en: { relates: "Relates to", belongs: "Belongs to", supports: "Supports", depends: "Depends on", mentions: "Mentions" }
};
