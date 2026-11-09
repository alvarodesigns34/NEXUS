"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Cloud, Download, Fingerprint, Laptop, LockKeyhole, Palette, Sparkles, Upload } from "lucide-react";
import type { Locale } from "../lib/copy";
import { emptyWorkspace, workspaceSchema, type Workspace } from "../lib/knowledge";
import type { AnswerBlock, Chunk } from "../lib/retrieval";

type CloudState = { signedIn: boolean; email?: string; revision?: number; workspace?: Workspace | null; updatedAt?: string | null };
type SettingsProps = {
  locale: Locale; theme: "system" | "light" | "dark"; solid: boolean; ready: boolean; available: boolean; workspace: Workspace;
  replace: (workspace: Workspace) => Promise<boolean>; setLocale: (value: Locale) => void; setTheme: (value: SettingsProps["theme"]) => void; setSolid: (value: boolean) => void;
};

export function SettingsPanel({ locale, theme, solid, ready, available, workspace, replace, setLocale, setTheme, setSolid }: SettingsProps) {
  const t = (es: string, en: string) => locale === "es" ? es : en;
  const input = useRef<HTMLInputElement>(null);
  const [cloud, setCloud] = useState<CloudState | null>(null);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function refresh(signal?: AbortSignal) {
    const response = await fetch("/api/cloud", { signal, cache: "no-store" });
    if (!response.ok) throw new Error("Unavailable");
    setCloud(await response.json());
  }

  useEffect(() => {
    if (!available) return;
    const controller = new AbortController();
    refresh(controller.signal).catch(() => { if (!controller.signal.aborted) setMessage("No se pudo consultar Supabase. / Could not reach Supabase."); });
    const url = new URL(window.location.href);
    if (url.searchParams.has("auth")) {
      if (url.searchParams.get("auth") === "error") setMessage("Enlace de acceso inválido o caducado. / Invalid or expired sign-in link.");
      url.searchParams.delete("auth");
      window.history.replaceState(null, "", url);
    }
    return () => controller.abort();
  }, [available]);

  async function cloudAction(payload: object, success: string) {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/cloud", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (response.status === 409) {
        await refresh();
        setMessage(t("La copia cambió. Revisa su fecha antes de volver a intentarlo.", "The backup changed. Check its date before retrying."));
        return;
      }
      if (!response.ok) throw new Error("Cloud action failed");
      setMessage(success);
      if (!("action" in payload) || payload.action !== "login") await refresh();
    } catch { setMessage(t("La operación de nube no pudo confirmarse. Actualiza el estado antes de reintentar.", "The cloud operation could not be confirmed. Refresh status before retrying.")); }
    finally { setBusy(false); }
  }

  function download() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(workspace, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `NEXUS-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return <section className="section-content enter">
    <div className="section-title"><div><p className="eyebrow">{t("PREFERENCIAS Y DATOS", "PREFERENCES AND DATA")}</p><h1>{t("Ajustes", "Settings")}</h1></div></div>
    <div className="settings-list">
      <section className="setting"><Palette size={22}/><div><h2>{t("Apariencia", "Appearance")}</h2><p>{t("Ajusta NEXUS a cómo prefieres trabajar.", "Make NEXUS fit how you work.")}</p>
        <div className="inline-actions"><label>{t("Tema", "Theme")}<select value={theme} onChange={event => setTheme(event.target.value as SettingsProps["theme"])}><option value="system">{t("Sistema", "System")}</option><option value="light">{t("Claro", "Light")}</option><option value="dark">{t("Oscuro", "Dark")}</option></select></label>
        <label>{t("Idioma", "Language")}<select value={locale} onChange={event => setLocale(event.target.value as Locale)}><option value="es">Español</option><option value="en">English</option></select></label></div>
        <label className="check"><input type="checkbox" checked={solid} onChange={event => setSolid(event.target.checked)}/>{t("Reducir transparencia", "Reduce transparency")}</label>
      </div></section>
      <section className="setting"><Laptop size={22}/><div><h2>{t("Datos del dispositivo", "Device data")}</h2><p>{t("Tu biblioteca se guarda en este navegador. Exporta una copia antes de borrar sus datos.", "Your library is saved in this browser. Export a copy before clearing its data.")}</p>
        <div className="inline-actions"><button className="secondary" disabled={!ready} onClick={download}><Download size={16}/>{t("Exportar biblioteca", "Export library")}</button>
        <button className="secondary" disabled={!ready} onClick={() => input.current?.click()}><Upload size={16}/>{t("Importar copia", "Import backup")}</button>
        <button className="quiet danger" disabled={!ready || !workspace.entries.length} onClick={async () => {
          if (window.confirm(t("¿Borrar la biblioteca de este dispositivo?", "Erase the library on this device?"))) await replace(emptyWorkspace);
        }}>{t("Borrar datos locales", "Erase local data")}</button></div>
        <input type="file" accept=".json,application/json" hidden ref={input} onChange={async event => {
          const file = event.target.files?.[0]; event.target.value = "";
          if (!file) return;
          try {
            if (file.size > 25_000_000) throw new Error("File too large");
            const data = workspaceSchema.parse(JSON.parse(await file.text()));
            if (workspace.entries.length && !window.confirm(t("¿Reemplazar la biblioteca local por esta copia?", "Replace your local library with this backup?"))) return;
            if (await replace(data)) setMessage(t("Copia importada.", "Backup imported."));
          } catch { setMessage(t("La copia no es válida o supera el límite de 25 MB.", "The backup is invalid or exceeds 25 MB.")); }
        }}/>
      </div></section>
      <section className="setting"><Cloud size={22}/><div><h2>{t("Copia privada en la nube", "Private cloud backup")}</h2><p>{t("Tú decides cuándo guardar o restaurar una copia. Supabase procesa los datos de la copia.", "You choose when to save or restore a copy. Supabase processes backup data.")}</p>
        {!available ? <p className="tag"><LockKeyhole size={14}/>{t("Supabase pendiente de configurar", "Supabase setup required")}</p> : cloud?.signedIn ? <>
          <p>{cloud.email}{cloud.updatedAt ? ` · ${new Date(cloud.updatedAt).toLocaleString(locale)}` : ""}</p>
          <div className="inline-actions">
            <button className="secondary" disabled={busy || !ready} onClick={() => {
              if (cloud.workspace && !window.confirm(t("¿Reemplazar la copia en la nube?", "Replace your cloud backup?"))) return;
              void cloudAction({ action: "backup", revision: cloud.revision, workspace }, t("Copia guardada en la nube.", "Cloud backup saved."));
            }}>{t("Guardar copia", "Save backup")}</button>
            <button className="secondary" disabled={busy || !ready || !cloud.workspace} onClick={async () => {
              if (workspace.entries.length && !window.confirm(t("¿Reemplazar la biblioteca local con la copia en la nube?", "Replace your local library with the cloud backup?"))) return;
              const copy = workspaceSchema.safeParse(cloud.workspace);
              if (!copy.success) { setMessage(t("La copia no se puede leer.", "The backup could not be read.")); return; }
              if (await replace(copy.data)) setMessage(t("Copia restaurada en este dispositivo.", "Backup restored on this device."));
            }}>{t("Restaurar copia", "Restore backup")}</button>
            <button className="quiet danger" disabled={busy || !cloud.workspace} onClick={() => {
              if (window.confirm(t("¿Eliminar la copia en la nube?", "Delete the cloud backup?"))) void cloudAction({ action: "delete", revision: cloud.revision }, t("Copia eliminada.", "Backup deleted."));
            }}>{t("Eliminar copia", "Delete backup")}</button>
            <button className="quiet" disabled={busy} onClick={() => void cloudAction({ action: "clear-ai" }, t("Caché de IA eliminada.", "AI cache cleared."))}>{t("Borrar caché de IA", "Clear AI cache")}</button>
            <button className="quiet" disabled={busy} onClick={() => void cloudAction({ action: "logout" }, t("Sesión cerrada.", "Signed out."))}>{t("Cerrar sesión", "Sign out")}</button>
          </div></> : <form className="inline-actions" onSubmit={event => { event.preventDefault(); void cloudAction({ action: "login", email }, t("Revisa tu correo y abre el enlace en este navegador.", "Check your email and open the link in this browser.")); }}>
            <input type="email" maxLength={254} required value={email} onChange={event => setEmail(event.target.value)} placeholder="nombre@ejemplo.com" aria-label={t("Correo electrónico", "Email address")}/>
            <button className="secondary" disabled={busy}>{t("Enviar enlace de acceso", "Send sign-in link")}</button>
          </form>}
        {available && <button className="quiet" disabled={busy} onClick={() => void refresh().catch(() => setMessage(t("No se pudo actualizar el estado.", "Could not refresh status.")))}>{t("Actualizar estado", "Refresh status")}</button>}
      </div></section>
      <section className="setting"><Fingerprint size={22}/><div><h2>{t("Privacidad", "Privacy")}</h2><p>{t("Mistral recibe la pregunta y fragmentos de las fuentes que autorices para cada consulta. Los vectores se guardan en una caché privada de Supabase. Consulta la política de retención de tu cuenta de Mistral antes de enviar contenido confidencial.", "Mistral receives the question and passages from sources you authorize for each request. Vectors are cached privately in Supabase. Check your Mistral account retention policy before sending sensitive content.")}</p></div></section>
    </div>
    <p role="status" className="muted">{message}</p>
  </section>;
}

type ResponseData = { blocks: AnswerBlock[]; sources: Chunk[] };
export function Assistant({ locale, available, workspace, open, settings }: { locale: Locale; available: boolean; workspace: Workspace; open: (id: string) => void; settings: () => void }) {
  const t = (es: string, en: string) => locale === "es" ? es : en;
  const [status, setStatus] = useState({ enabled: false, signedIn: false });
  const [checking, setChecking] = useState(available);
  const [question, setQuestion] = useState("");
  const [chosen, setChosen] = useState<string[]>([]);
  const [sourceQuery, setSourceQuery] = useState("");
  const [consent, setConsent] = useState(false);
  const [general, setGeneral] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [answers, setAnswers] = useState<{ question: string; result: ResponseData }[]>([]);
  const entryMap = new Map(workspace.entries.map(entry => [entry.id, entry]));
  const visible = workspace.entries.filter(entry => chosen.includes(entry.id) || entry.title.toLocaleLowerCase().includes(sourceQuery.toLocaleLowerCase())).sort((a, b) => Number(chosen.includes(b.id)) - Number(chosen.includes(a.id))).slice(0, 30);

  useEffect(() => {
    if (!available) return;
    const controller = new AbortController();
    fetch("/api/assistant", { signal: controller.signal, cache: "no-store" }).then(response => response.ok ? response.json() : Promise.reject()).then(setStatus, () => {
      if (!controller.signal.aborted) setError("No se pudo comprobar el asistente. / Could not check the assistant.");
    }).finally(() => { if (!controller.signal.aborted) setChecking(false); });
    return () => controller.abort();
  }, [available]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!consent || busy || !chosen.length) return;
    setBusy(true); setError("");
    try {
      const sources = chosen.flatMap(id => {
        const entry = entryMap.get(id);
        return entry ? [{ id, title: entry.title, body: entry.body.slice(0, 6000) }] : [];
      });
      const response = await fetch("/api/assistant", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, locale, sources, allowGeneral: general, consent: true })
      });
      if (response.status === 429) throw new Error(t("Se alcanzó el límite diario de consultas.", "Daily request limit reached."));
      if (!response.ok) throw new Error(t("No se pudo completar la consulta. Prueba de nuevo más tarde.", "The request could not be completed. Try again later."));
      const result: ResponseData = await response.json();
      setAnswers(previous => [{ question, result }, ...previous].slice(0, 8)); setQuestion(""); setConsent(false);
    } catch (reason) { setError(reason instanceof Error ? reason.message : t("Error de conexión.", "Connection error.")); }
    finally { setBusy(false); }
  }

  return <section className="section-content enter">
    <div className="section-title"><div><p className="eyebrow">{t("INVESTIGA TU BIBLIOTECA", "EXPLORE YOUR LIBRARY")}</p><h1>{t("Asistente", "Assistant")}</h1></div></div>
    <p className="section-intro">{t("Haz una pregunta y decide qué elementos puede consultar NEXUS. Cada referencia vuelve al original.", "Ask a question and choose which items NEXUS can consult. Each reference leads back to the original.")}</p>
    {error && <p role="alert" className="error">{error}</p>}
    {checking ? <p role="status" className="muted">{t("Comprobando configuración…", "Checking configuration…")}</p>
    : !status.enabled || !status.signedIn ? <div className="empty"><Sparkles size={25}/><h2>{status.enabled ? t("Conecta tu cuenta", "Connect your account") : t("Mistral pendiente de configurar", "Mistral setup required")}</h2><p>{t("El asistente requiere Supabase y una clave de Mistral en el servidor.", "The assistant requires Supabase and a server-side Mistral key.")}</p><button className="secondary" onClick={settings}>{t("Abrir ajustes", "Open settings")}</button></div>
    : <form className="assistant-form" onSubmit={submit}>
      <label>{t("Tu pregunta", "Your question")}<textarea value={question} required minLength={3} maxLength={700} onChange={event => setQuestion(event.target.value)} placeholder={t("¿Qué quiero averiguar?", "What do I want to find out?")}/></label>
      <fieldset><legend>{t("Fuentes autorizadas", "Authorized sources")} · {chosen.length}/6</legend>
        <input aria-label={t("Buscar fuentes", "Find sources")} value={sourceQuery} onChange={event => setSourceQuery(event.target.value)} placeholder={t("Buscar fuentes…", "Find sources…")}/>
        <div className="source-options">{visible.map(entry => <label className="check" key={entry.id}><input type="checkbox" checked={chosen.includes(entry.id)} disabled={busy || (chosen.length >= 6 && !chosen.includes(entry.id))} onChange={event => {
          setChosen(event.target.checked ? [...chosen, entry.id] : chosen.filter(id => id !== entry.id)); setConsent(false);
        }}/>{entry.title}</label>)}</div>
        <p className="muted">{t("Se procesan hasta 6.000 caracteres por fuente.", "Up to 6,000 characters per source are processed.")}</p>
      </fieldset>
      <label className="check"><input type="checkbox" checked={general} onChange={event => setGeneral(event.target.checked)}/>{t("Permitir conocimiento general, identificado por separado", "Allow separately labeled general knowledge")}</label>
      <label className="check"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)}/>{t("Autorizo enviar esta pregunta y las fuentes seleccionadas a Mistral", "I authorize sending this question and the selected sources to Mistral")}</label>
      <button className="primary" disabled={busy || !consent || !chosen.length}><Sparkles size={16}/>{busy ? t("Consultando…", "Consulting…") : t("Consultar fuentes", "Consult sources")}</button>
    </form>}
    {answers.map(({ question: asked, result }, index) => <article className="answer" key={answers.length - index}>
      <h2>{asked}</h2>
      {result.blocks.map((block, blockIndex) => <div className="answer-block" key={blockIndex}>
        <p className="eyebrow">{{ source: t("DE TUS FUENTES", "FROM YOUR SOURCES"), inference: t("INFERENCIA", "INFERENCE"), general: t("CONOCIMIENTO GENERAL", "GENERAL KNOWLEDGE"), unknown: t("EVIDENCIA INSUFICIENTE", "INSUFFICIENT EVIDENCE") }[block.kind]}</p>
        <p>{block.text}</p>
        {result.sources.filter(source => block.citations.includes(source.id)).map(source => <details key={source.id}><summary>{source.id} · {source.title}</summary><blockquote>{source.text}</blockquote>{entryMap.has(source.sourceId) && <button className="quiet" onClick={() => open(source.sourceId)}>{t("Abrir original", "Open original")} <ArrowUpRight size={15}/></button>}</details>)}
      </div>)}
    </article>)}
  </section>;
}
