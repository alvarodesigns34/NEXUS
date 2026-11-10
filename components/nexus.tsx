"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDownUp, ArrowRight, ArrowUpRight, BookOpen, Command, FileText, FolderOpen, House, Lightbulb, Network, Plus, Search, Settings, Sparkles } from "lucide-react";
import { labels, type Locale } from "../lib/copy";
import { emptyWorkspace, kinds, newEntry, relationKey, removeEntry, search, suggest, workspaceSchema, type Entry, type Kind, type Predicate, type Relation, type Workspace } from "../lib/knowledge";
import { publicPath } from "../lib/public-path";
import { loadLocal, saveLocal } from "../lib/local";
import { Constellation, KindIcon } from "./ui";
import { Assistant, SettingsPanel } from "./panels";

const Editor = dynamic(() => import("./editor"));
const Graph = dynamic(() => import("./graph"));
const navigation = ["home", "library", "graph", "assistant", "settings"] as const;
type View = (typeof navigation)[number];
type Theme = "system" | "light" | "dark";
const icons = { home: House, library: BookOpen, graph: Network, assistant: Sparkles, settings: Settings };
const viewLabels: Record<Locale, Record<View, string>> = {
  es: { home: "Inicio", library: "Biblioteca", graph: "Grafo", assistant: "Asistente", settings: "Ajustes" },
  en: { home: "Home", library: "Library", graph: "Graph", assistant: "Assistant", settings: "Settings" }
};

export default function Nexus({ cloudAvailable }: { cloudAvailable: boolean }) {
  const [stored, setStored] = useState({ workspace: emptyWorkspace, revision: 0 });
  const [ready, setReady] = useState(false);
  const [today, setToday] = useState<Date | null>(null);
  const [view, setView] = useState<View>("home");
  const [locale, setLocale] = useState<Locale>("es");
  const [theme, setTheme] = useState<Theme>("system");
  const [solid, setSolid] = useState(false);
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState<{ entry: Entry; isNew: boolean } | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Kind | "all">("all");
  const [alpha, setAlpha] = useState(false);
  const searchInput = useRef<HTMLInputElement>(null);
  const lock = useRef(false);
  const t = (es: string, en: string) => locale === "es" ? es : en;
  const workspace = stored.workspace;
  const pending = workspace.relations.filter(edge => edge.status === "pending");

  useEffect(() => {
    let active = true;
    setToday(new Date());
    loadLocal().then(value => { if (active) { setStored(value); setReady(true); } }, () => {
      if (active) setNotice("No se pudo abrir el almacenamiento local. / Local storage unavailable.");
    });
    try {
      const savedLocale = localStorage.getItem("nexus-locale");
      const savedTheme = localStorage.getItem("nexus-theme");
      if (savedLocale === "en") setLocale("en");
      if (savedTheme === "dark" || savedTheme === "light") setTheme(savedTheme);
      setSolid(localStorage.getItem("nexus-solid") === "true");
    } catch { /* Preferences are optional. */ }
    return () => { active = false; };
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.solid = String(solid);
  }, [locale, theme, solid]);

  function preference<T extends string | boolean>(key: string, setter: (value: T) => void, value: T) {
    setter(value);
    try { localStorage.setItem(key, String(value)); } catch { /* Keep the session preference. */ }
  }

  function navigate(next: View) {
    if (next !== view) window.scrollTo(0, 0);
    setView(next);
  }

  useEffect(() => {
    function keydown(event: KeyboardEvent) {
      if (editing || !(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "k") return;
      event.preventDefault();
      setView("library"); setFilter("all");
      window.scrollTo(0, 0);
      requestAnimationFrame(() => searchInput.current?.focus());
    }
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, [editing]);

  async function commit(next: Workspace) {
    if (!ready || lock.current) return false;
    const checked = workspaceSchema.safeParse(next);
    if (!checked.success) {
      setNotice(t("No se guardó. Revisa los campos, los límites del espacio o si la conexión ya existe.", "Could not save. Check fields, workspace limits, or whether the connection already exists."));
      return false;
    }
    lock.current = true;
    try {
      const saved = await saveLocal(checked.data, stored.revision);
      if (!saved) {
        setStored(await loadLocal());
        setNotice(t("Otra pestaña actualizó el espacio. Cierra y vuelve a abrir el editor antes de reintentar.", "Another tab changed the workspace. Close and reopen the editor before retrying."));
        return false;
      }
      setStored(saved);
      setNotice(t("Cambios guardados en este dispositivo.", "Changes saved on this device."));
      return true;
    } catch {
      setNotice(t("El dispositivo no pudo guardar los cambios.", "The device could not save changes."));
      return false;
    } finally { lock.current = false; }
  }

  function capture(kind: Kind) {
    if (ready) setEditing({ entry: newEntry(kind, ""), isNew: true });
  }

  function open(id: string) {
    const entry = workspace.entries.find(item => item.id === id);
    if (entry) setEditing({ entry, isNew: false });
  }

  async function save(entry: Entry, connection?: { to: string; predicate: Predicate }) {
    if (!editing || (!editing.isNew && !workspace.entries.some(item => item.id === entry.id && item.updatedAt === editing.entry.updatedAt))) return false;
    const entries = editing.isNew ? [entry, ...workspace.entries] : workspace.entries.map(item => item.id === entry.id ? entry : item);
    let relations = workspace.relations;
    if (connection) {
      const edge: Relation = { ...connection, id: crypto.randomUUID(), from: entry.id, origin: "manual", status: "accepted" };
      const existing = relations.find(item => relationKey(item) === relationKey(edge));
      if (existing?.status !== "accepted") relations = [...relations.filter(item => item.id !== existing?.id), edge];
    }
    return commit({ ...workspace, entries, relations });
  }

  const filtered = useMemo(() => {
    const results = search(workspace.entries, query).filter(entry => filter === "all" || entry.kind === filter);
    return alpha ? results.sort((a, b) => a.title.localeCompare(b.title, locale)) : results;
  }, [workspace.entries, query, filter, alpha, locale]);
  const recent = useMemo(() => search(workspace.entries, "").slice(0, 5), [workspace.entries]);
  const pinned = workspace.entries.filter(entry => entry.pinned).slice(0, 5);
  const title = viewLabels[locale];
  const date = new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long" }).format(today ?? undefined);
  const currentEdges = editing ? workspace.relations.filter(edge => edge.status === "accepted" && (edge.from === editing.entry.id || edge.to === editing.entry.id)) : [];

  function itemRows(entries: Entry[]) {
    return <ul className="item-list">{entries.map(entry => <li key={entry.id}><button className="item-row" onClick={() => open(entry.id)}>
      <KindIcon kind={entry.kind}/><span className="item-text"><strong>{entry.title}</strong><small>{labels[locale][entry.kind]}{entry.tags.length > 0 ? " · " + entry.tags.slice(0, 3).join(" · ") : ""}</small></span>
      <span className="item-date">{new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(new Date(entry.updatedAt))}</span><ArrowUpRight size={15}/>
    </button></li>)}</ul>;
  }

  return <div className="shell">
    <a className="skip-link" href="#main">{t("Saltar al contenido", "Skip to content")}</a>
    <aside className="sidebar">
      <button className="brand" onClick={() => navigate("home")}><img src={publicPath("/nexus.svg")} width="38" height="38" alt="" /><span><strong>NEXUS</strong><small>{t("ESTUDIO PERSONAL", "PERSONAL STUDIO")}</small></span></button>
      <p className="sidebar-label">{t("ESPACIO DE TRABAJO", "WORKSPACE")}</p>
      <nav className="navigation" aria-label={t("Principal", "Main")}>{navigation.map(name => {
        const Icon = icons[name];
        return <button className={view === name ? "nav-item active" : "nav-item"} key={name} aria-current={view === name ? "page" : undefined} onClick={() => { if (name === "library") { setQuery(""); setFilter("all"); } navigate(name); }}><Icon size={19} aria-hidden="true"/><span>{title[name]}</span></button>;
      })}</nav>
      <div className="sidebar-bottom"><div className="profile-mark">N</div><div><strong>{t("Mi espacio", "My space")}</strong><small><i/>{t("En este dispositivo", "On this device")}</small></div></div>
    </aside>
    <div className="work">
      <header className="topbar">
        <div className="breadcrumb"><span className="mobile-mark"><img src={publicPath("/nexus.svg")} alt="" width="27" height="27" /></span><span>{t("Mi espacio", "My space")}</span><span className="slash">/</span><strong>{title[view]}</strong></div>
        <div className="top-actions">
          <button className="search-launch secondary" aria-label={t("Buscar", "Search")} onClick={() => { navigate("library"); setFilter("all"); requestAnimationFrame(() => searchInput.current?.focus()); }}><Search size={16}/><span>{t("Buscar", "Search")}</span><kbd><Command size={11}/> K</kbd></button>
          <button className="primary" onClick={() => capture("note")} disabled={!ready}><Plus size={17}/><span>{t("Capturar", "Capture")}</span></button>
        </div>
      </header>
      <main id="main" className="main" tabIndex={-1}>
        {view === "home" && <div className="home enter">
          <div className="date-line"><span className="status-dot"/>{today ? date : "\u00a0"}</div>
          <section className="hero">
            <Constellation/>
            <div className="hero-content">
              <p className="eyebrow"><span/> {t("TU SEGUNDO CEREBRO", "YOUR SECOND BRAIN")}</p>
              <h1>{t("Un lugar para", "A space for")}<br/><em>{t("pensar mejor.", "thinking better.")}</em></h1>
              <p>{t("Captura lo que importa. Conecta lo que aprendes.", "Capture what matters. Connect what you learn.")}</p>
              <button className="hero-button" onClick={() => capture("idea")} disabled={!ready}>{t("Capturar una idea", "Capture an idea")}<ArrowRight size={17}/></button>
            </div>
            <span className="hero-index" aria-hidden="true">FIG. 01 &nbsp; / &nbsp; NEXUS</span>
          </section>
          <section className="quick"><p className="eyebrow">{t("EMPEZAR", "GET STARTED")}</p><h2>{t("Captura rápida", "Quick capture")}</h2><div className="quick-actions">
            {([{ kind: "note", Icon: FileText, description: t("Escribe y desarrolla", "Write and develop") }, { kind: "idea", Icon: Lightbulb, description: t("Guarda un destello", "Save a spark") }, { kind: "project", Icon: FolderOpen, description: t("Reúne lo que haces", "Bring your work together") }] as const).map(({kind, Icon, description}) =>
              <button className="quick-action" key={kind} onClick={() => capture(kind)} disabled={!ready}><span className={`kind-icon kind-${kind}`}><Icon size={19}/></span><span><strong>{labels[locale][kind]}</strong><small>{description}</small></span><ArrowUpRight size={15} className="quick-arrow"/></button>)}
          </div></section>
          <div className="home-columns">
            <section><div className="list-heading"><div><p className="eyebrow">{t("TU BIBLIOTECA", "YOUR LIBRARY")}</p><h2>{t("Actividad reciente", "Recent activity")}</h2></div><button className="quiet" onClick={() => { setQuery(""); setFilter("all"); navigate("library"); }}>{t("Ver todo", "View all")} <ArrowRight size={14}/></button></div>
            {recent.length ? itemRows(recent) : <div className="empty home-empty"><FileText size={21}/><h3>{t("Todavía está por escribir", "Still to be written")}</h3><p>{t("Tus primeras capturas aparecerán aquí.", "Your first captures will appear here.")}</p></div>}</section>
            <section className="overview"><p className="eyebrow">{t("EN CIFRAS", "AT A GLANCE")}</p><h2>{t("Tu espacio", "Your space")}</h2><dl><div><dt>{t("Elementos", "Items")}</dt><dd>{workspace.entries.length}</dd></div><div><dt>{t("Conexiones", "Connections")}</dt><dd>{workspace.relations.filter(edge => edge.status === "accepted").length}</dd></div><div><dt>{t("Proyectos", "Projects")}</dt><dd>{workspace.entries.filter(entry => entry.kind === "project").length}</dd></div></dl></section>
          </div>
          {pinned.length > 0 && <section className="pinned"><p className="eyebrow">{t("A MANO", "WITHIN REACH")}</p><h2>{t("Destacados", "Pinned")}</h2>{itemRows(pinned)}</section>}
          {pending.length > 0 && <section className="pinned"><p className="eyebrow">{t("POR REVISAR", "TO REVIEW")}</p><h2>{t("Conexiones sugeridas", "Suggested connections")}</h2>
            {pending.map(edge => <div className="suggestion" key={edge.id}><div><strong>{workspace.entries.find(entry => entry.id === edge.from)?.title} ↔ {workspace.entries.find(entry => entry.id === edge.to)?.title}</strong><small>{t("Coincidencia por etiquetas", "Matching tags")}</small></div>
              <button className="secondary" onClick={() => void commit({ ...workspace, relations: workspace.relations.map(item => item.id === edge.id ? { ...item, status: "dismissed" } : item) })}>{t("Descartar", "Dismiss")}</button>
              <button className="primary" onClick={() => void commit({ ...workspace, relations: workspace.relations.map(item => item.id === edge.id ? { ...item, status: "accepted" } : item) })}>{t("Aceptar", "Accept")}</button></div>)}
          </section>}
        </div>}
        {view === "library" && <section className="section-content enter">
          <div className="section-title"><div><p className="eyebrow">{t("TU CONOCIMIENTO", "YOUR KNOWLEDGE")}</p><h1>{title.library}</h1></div><button className="primary" onClick={() => capture(filter === "all" ? "note" : filter)} disabled={!ready}><Plus size={16}/>{t("Nuevo", "New")}</button></div>
          <div className="filters library-filters"><label className="search-field"><Search size={18}/><input ref={searchInput} value={query} onChange={event => setQuery(event.target.value)} aria-label={t("Buscar en la biblioteca", "Search the library")} placeholder={t("Busca títulos, contenido o etiquetas…", "Search titles, content or tags…")} /></label>
          <select aria-label={t("Filtrar por tipo", "Filter by type")} value={filter} onChange={event => setFilter(event.target.value as Kind | "all")}><option value="all">{t("Todos los tipos", "All types")}</option>{kinds.map(kind => <option value={kind} key={kind}>{labels[locale][kind]}</option>)}</select>
          <button className="secondary" aria-pressed={alpha} onClick={() => setAlpha(!alpha)}><ArrowDownUp size={16}/>{alpha ? "A–Z" : t("Recientes", "Recent")}</button></div>
          <p className="muted result-count" aria-live="polite">{filtered.length} {t("elementos", "items")}</p>
          {filtered.length ? itemRows(filtered) : <div className="empty"><BookOpen size={25}/><h2>{query || filter !== "all" ? t("Sin coincidencias", "No matches") : t("Tu biblioteca está vacía", "Your library is empty")}</h2><p>{query || filter !== "all" ? t("Prueba otra búsqueda o cambia el filtro.", "Try another search or change your filter.") : t("Guarda una primera nota para empezar a construirla.", "Save a first note to get started.")}</p></div>}
        </section>}
        {view === "graph" && <Graph workspace={workspace} locale={locale} open={open}/>}
        {view === "assistant" && <Assistant locale={locale} available={cloudAvailable} workspace={workspace} open={open} settings={() => navigate("settings")}/>}
        {view === "settings" && <SettingsPanel locale={locale} theme={theme} solid={solid} ready={ready} available={cloudAvailable} workspace={workspace} replace={commit} setLocale={value => preference("nexus-locale", setLocale, value)} setTheme={value => preference("nexus-theme", setTheme, value)} setSolid={value => preference("nexus-solid", setSolid, value)}/>}
      </main>
      <footer className="work-footer"><span>NEXUS / {t("ESTUDIO PERSONAL", "PERSONAL STUDIO")}</span><span>{t("TU CONOCIMIENTO, A TU RITMO", "YOUR KNOWLEDGE, AT YOUR PACE")}</span></footer>
    </div>
    <div className={notice ? "notice visible" : "notice"} role="status">{notice}{notice && <button type="button" className="quiet" aria-label={t("Cerrar aviso", "Dismiss notice")} onClick={() => setNotice("")}>×</button>}</div>
    {editing && <Editor key={editing.entry.id} initial={editing.entry} isNew={editing.isNew} locale={locale} entries={workspace.entries.filter(item => item.id !== editing.entry.id)} edges={currentEdges}
      close={() => setEditing(null)} save={save} remove={() => commit(removeEntry(workspace, editing.entry.id))} open={open}
      removeEdge={id => { void commit({ ...workspace, relations: workspace.relations.filter(edge => edge.id !== id) }); }}
      suggest={() => { const edges = suggest(workspace, editing.entry.id); if (edges.length) { void commit({ ...workspace, relations: [...workspace.relations, ...edges] }); } else setNotice(t("No hay nuevas coincidencias por etiquetas.", "No new matching tags.")); }}/>}
  </div>;
}
