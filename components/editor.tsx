"use client";

import { useEffect, useRef, useState } from "react";
import { Bold, Code, Download, Heading, Italic, List, Paperclip, Pin, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { type Locale, labels, relationship } from "../lib/copy";
import { kinds, predicates, type Entry, type Predicate, type Relation } from "../lib/knowledge";
import { Dialog } from "./ui";
import { readDraft, storeDraft } from "../lib/drafts";

type Props = {
  initial: Entry; isNew: boolean; locale: Locale; entries: Entry[]; edges: Relation[];
  close: () => void; save: (entry: Entry, edge?: { to: string; predicate: Predicate }) => Promise<boolean>;
  remove: () => Promise<boolean>; open: (id: string) => void;
  removeEdge: (id: string) => void; suggest: () => void;
};

export default function Editor({ initial, isNew, locale, entries, edges, close, save, remove, open, removeEdge, suggest }: Props) {
  const t = (es: string, en: string) => locale === "es" ? es : en;
  const draftKey = isNew ? `nexus-draft:new:${initial.kind}` : `nexus-draft:${initial.id}:${initial.updatedAt}`;
  const [restored] = useState(() => readDraft(draftKey));
  const [draft, setDraft] = useState(() => restored ? { ...initial, kind: restored.kind, title: restored.title, body: restored.body, url: restored.url, pinned: restored.pinned } : initial);
  const [tags, setTags] = useState(restored?.tags ?? initial.tags.join(", "));
  const [target, setTarget] = useState(() => restored && entries.some(item => item.id === restored.target) ? restored.target : "");
  const [predicate, setPredicate] = useState<Predicate>(restored?.predicate ?? "relates");
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [history, showHistory] = useState(false);
  const textArea = useRef<HTMLTextAreaElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const dirty = draft.kind !== initial.kind || draft.title !== initial.title || draft.body !== initial.body ||
    draft.url !== initial.url || draft.pinned !== initial.pinned || tags !== initial.tags.join(", ") || Boolean(target);
  useEffect(() => {
    storeDraft(draftKey, dirty ? { kind: draft.kind, title: draft.title, body: draft.body, url: draft.url, pinned: draft.pinned, tags, target, predicate } : undefined);
  }, [draftKey, dirty, draft, tags, target, predicate]);
  const leave = (next: () => void) => {
    if (!busy) next();
  };

  function exportNote() {
    const filename = draft.title.trim().replace(/[<>:"/\\|?*\x00-\x1f]/g, "-").slice(0, 100) || "NEXUS";
    const file = new Blob([`# ${draft.title.trim()}\n\n${draft.body}${draft.url ? `\n\n${draft.url}` : ""}\n`], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename + ".md";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function format(before: string, after = "") {
    const field = textArea.current;
    if (!field) return;
    const { selectionStart: start, selectionEnd: end } = field;
    setDraft({ ...draft, body: draft.body.slice(0, start) + before + draft.body.slice(start, end) + after + draft.body.slice(end) });
    requestAnimationFrame(() => { field.focus(); field.setSelectionRange(start + before.length, end + before.length); });
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const cleanTags = Array.from(new Set(tags.split(",").map(tag => tag.trim()).filter(Boolean)));
    if (!draft.title.trim() || cleanTags.length > 12 || cleanTags.some(tag => tag.length > 40)) {
      setError(t("Escribe un título y usa hasta 12 etiquetas de 40 caracteres.", "Enter a title and use up to 12 tags of 40 characters."));
      return;
    }
    if (draft.url && !/^https?:\/\//i.test(draft.url)) {
      setError(t("El enlace debe empezar por https:// o http://.", "The link must start with https:// or http://."));
      return;
    }
    const now = new Date().toISOString();
    const versions = !isNew && (draft.title !== initial.title || draft.body !== initial.body)
      ? [{ title: initial.title, body: initial.body, at: initial.updatedAt }, ...initial.history].slice(0, 5) : initial.history;
    setBusy(true);
    setError("");
    if (await save({ ...draft, title: draft.title.trim(), tags: cleanTags, history: versions, updatedAt: now }, target ? { to: target, predicate } : undefined)) {
      storeDraft(draftKey);
      close();
    }
    else { setBusy(false); setError(t("No se guardó. Conserva este borrador y revisa el aviso del espacio.", "Could not save. Keep this draft and check the workspace notice.")); }
  }

  return <Dialog title={isNew ? t("Nueva captura", "New capture") : t("Editar elemento", "Edit item")} closeLabel={t("Cerrar", "Close")} wide variant="editor" onClose={() => leave(close)}
    action={<button className="primary editor-save" disabled={busy} form="nexus-editor" type="submit">{busy ? t("Guardando…", "Saving…") : t("Guardar", "Save")}</button>}>
    <form className="editor-form" id="nexus-editor" onSubmit={submit} onKeyDown={event => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (!busy) event.currentTarget.requestSubmit();
      }
    }}>
      {restored && <p className="draft-state" role="status">{t("Borrador recuperado", "Draft restored")}</p>}
      <div className="editor-meta">
        <select aria-label={t("Tipo de elemento", "Item type")} value={draft.kind} onChange={event => setDraft({ ...draft, kind: event.target.value as Entry["kind"] })}>{kinds.map(kind => <option key={kind} value={kind}>{labels[locale][kind]}</option>)}</select>
        <button type="button" className="secondary" aria-pressed={draft.pinned} onClick={() => setDraft({ ...draft, pinned: !draft.pinned })}><Pin size={16} />{t("Destacar", "Pin")}</button>
      </div>
      <input className="editor-title" aria-label={t("Título", "Title")} placeholder={t("Escribe un título…", "Give it a title…")} required maxLength={160} value={draft.title} onChange={event => setDraft({ ...draft, title: event.target.value })} data-initial-focus />
      <div className="writing-area">
        <div className="format-bar" aria-label={t("Formato Markdown", "Markdown formatting")}>
          <button type="button" className="icon-button" aria-label={t("Negrita", "Bold")} disabled={preview} onClick={() => format("**", "**")}><Bold size={16} /></button>
          <button type="button" className="icon-button" aria-label={t("Cursiva", "Italic")} disabled={preview} onClick={() => format("*", "*")}><Italic size={16} /></button>
          <button type="button" className="icon-button" aria-label={t("Encabezado", "Heading")} disabled={preview} onClick={() => format("## ")}><Heading size={16} /></button>
          <button type="button" className="icon-button" aria-label={t("Lista", "List")} disabled={preview} onClick={() => format("- ")}><List size={16} /></button>
          <button type="button" className="icon-button" aria-label={t("Código", "Code")} disabled={preview} onClick={() => format("`", "`")}><Code size={16} /></button>
          <button type="button" className="quiet preview-toggle" aria-pressed={preview} onClick={() => setPreview(!preview)}>{preview ? t("Escribir", "Write") : t("Vista previa", "Preview")}</button>
        </div>
        {preview ? <div className="markdown"><ReactMarkdown remarkPlugins={[remarkGfm]} components={{ img: () => null, a: ({ children, href }) => <a href={href} target="_blank" rel="noreferrer">{children}</a> }}>{draft.body || t("Aún no hay contenido.", "Nothing written yet.")}</ReactMarkdown></div>
          : <textarea ref={textArea} maxLength={60000} aria-label={t("Contenido", "Content")} value={draft.body} onChange={event => setDraft({ ...draft, body: event.target.value })} placeholder={t("Empieza a escribir. Puedes usar Markdown…", "Start writing. Markdown is supported…")} />}
      </div>
      <div className="editor-fields">
        <label>{t("Etiquetas", "Tags")}<input value={tags} onChange={event => setTags(event.target.value)} placeholder={t("Separadas por comas", "Separated by commas")} maxLength={500} /></label>
        <label>{t("URL de origen", "Source URL")}<input type="url" value={draft.url} onChange={event => setDraft({ ...draft, url: event.target.value })} placeholder="https://" maxLength={2000} /></label>
      </div>
      <input hidden ref={fileInput} type="file" accept=".txt,.md,.csv,.json,.log" onChange={async event => {
        const file = event.target.files?.[0]; event.target.value = "";
        if (!file) return;
        try {
          if (file.size > 240000) throw new Error("limit");
          const value = await file.text();
          if (value.length > 60000 || value.includes("\0")) throw new Error("limit");
          setDraft(current => ({ ...current, kind: "file", title: current.title || file.name.slice(0, 160), body: value }));
          setPreview(false); setError("");
        } catch { setError(t("Importa un archivo de texto UTF-8 de hasta 60.000 caracteres.", "Import a UTF-8 text file with up to 60,000 characters.")); }
      }} />
      <div className="inline-actions">
        <button className="secondary" type="button" onClick={() => { if (!draft.body || window.confirm(t("¿Reemplazar el contenido del borrador?", "Replace the draft content?"))) fileInput.current?.click(); }}><Paperclip size={16} />{t("Importar texto", "Import text")}</button>
        {draft.title.trim() && <button className="quiet" type="button" onClick={exportNote}><Download size={16}/>{t("Descargar Markdown", "Download Markdown")}</button>}
        {draft.url && /^https?:\/\//i.test(draft.url) && <a className="quiet" href={draft.url} target="_blank" rel="noreferrer">{t("Abrir fuente ↗", "Open source ↗")}</a>}
        {initial.history.length > 0 && <button className="quiet" type="button" aria-expanded={history} onClick={() => showHistory(!history)}>{t("Historial", "History")}</button>}
      </div>
      {history && <ul className="history-list">{initial.history.map((version, index) => <li key={index}><span>{new Date(version.at).toLocaleString(locale)} · {version.title}</span><button className="quiet" type="button" onClick={() => setDraft({ ...draft, title: version.title, body: version.body })}>{t("Cargar en el borrador", "Load into draft")}</button></li>)}</ul>}
      <section className="connections-panel" aria-label={t("Conexiones", "Connections")}>
        <h3>{t("Conexiones", "Connections")}</h3>
        {edges.map(edge => {
          const other = entries.find(entry => entry.id === (edge.from === initial.id ? edge.to : edge.from));
          return other && <div className="relation-row" key={edge.id}><button type="button" className="quiet" onClick={() => leave(() => open(other.id))}>{edge.from === initial.id ? "→ " : "← "}{relationship[locale][edge.predicate]} · {other.title}</button><button type="button" className="icon-button" aria-label={t("Eliminar conexión", "Remove connection")} onClick={() => removeEdge(edge.id)}><Trash2 size={15} /></button></div>;
        })}
        {entries.length > 0 && <div className="editor-fields">
          <select value={predicate} aria-label={t("Tipo de conexión", "Connection type")} onChange={event => setPredicate(event.target.value as Predicate)}>{predicates.map(item => <option value={item} key={item}>{relationship[locale][item]}</option>)}</select>
          <select value={target} aria-label={t("Conectar con", "Connect to")} onChange={event => setTarget(event.target.value)}><option value="">{t("Conectar con…", "Connect to…")}</option>{entries.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select>
        </div>}
        {!isNew && initial.tags.length > 0 && <button type="button" className="quiet" onClick={suggest}>{t("Buscar coincidencias por etiquetas", "Find matching tags")}</button>}
      </section>
      {error && <p className="error" role="alert">{error}</p>}
      <footer className="dialog-footer">
        {!isNew && <button className="danger quiet" type="button" disabled={busy} onClick={async () => {
          if (!window.confirm(t("¿Eliminar el elemento y sus conexiones?", "Delete this item and its connections?"))) return;
          setBusy(true); if (await remove()) { storeDraft(draftKey); close(); } else { setBusy(false); setError(t("No se pudo eliminar.", "Could not delete.")); }
        }}><Trash2 size={16} />{t("Eliminar", "Delete")}</button>}
        {dirty && <button className="quiet danger" type="button" disabled={busy} onClick={() => {
          if (window.confirm(t("¿Descartar este borrador?", "Discard this draft?"))) { storeDraft(draftKey); close(); }
        }}>{t("Descartar borrador", "Discard draft")}</button>}
      </footer>
    </form>
  </Dialog>;
}
