"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import cytoscape, { type Core } from "cytoscape";
import { Focus, Maximize2, Minimize2, Minus, Network, Plus } from "lucide-react";
import { labels, relationship, type Locale } from "../lib/copy";
import { kinds, search, type Kind, type Workspace } from "../lib/knowledge";
import { KindIcon } from "./ui";

const colors: Record<Kind, string> = { note: "#4a8c92", idea: "#ad751f", project: "#7562db", concept: "#9a5bba", person: "#b86186", link: "#427db8", file: "#7d709d", collection: "#6f7cb5" };

export default function Graph({ workspace, locale, open }: { workspace: Workspace; locale: Locale; open: (id: string) => void }) {
  const t = (es: string, en: string) => locale === "es" ? es : en;
  const canvas = useRef<HTMLDivElement>(null);
  const graph = useRef<Core | null>(null);
  const [selected, setSelected] = useState("");
  const [focus, setFocus] = useState("");
  const [filter, setFilter] = useState<Kind | "all">("all");
  const [query, setQuery] = useState("");
  const [origin, setOrigin] = useState("all");
  const [layout, setLayout] = useState("cose");
  const [error, setError] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const data = useMemo(() => {
    const eligible = workspace.relations.filter(edge => edge.status === "accepted" && (origin === "all" || edge.origin === origin));
    const neighbors = new Set([focus]);
    if (focus) for (const edge of eligible) {
      if (edge.from === focus) neighbors.add(edge.to);
      if (edge.to === focus) neighbors.add(edge.from);
    }
    const matched = search(workspace.entries, query).filter(entry => (filter === "all" || entry.kind === filter) && (!focus || neighbors.has(entry.id)));
    const entries = matched.slice(0, 90);
    const ids = new Set(entries.map(entry => entry.id));
    const edges = eligible.filter(edge => ids.has(edge.from) && ids.has(edge.to)).slice(0, 240);
    return { entries, edges, total: matched.length };
  }, [workspace, focus, query, filter, origin]);

  useEffect(() => {
    if (!canvas.current || !data.entries.length) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const colorScheme = window.matchMedia("(prefers-color-scheme: dark)");
    const theme = getComputedStyle(canvas.current);
    const color = (key: string) => theme.getPropertyValue(key).trim();
    let cy: Core | undefined;
    try {
      cy = cytoscape({
        container: canvas.current,
        elements: [
          ...data.entries.map(entry => ({ data: { id: entry.id, label: entry.title.length > 26 ? entry.title.slice(0, 25) + "…" : entry.title, color: colors[entry.kind] } })),
          ...data.edges.map(edge => ({ data: { id: edge.id, source: edge.from, target: edge.to, origin: edge.origin } }))
        ],
        style: [
          { selector: "node", style: { "background-color": "data(color)", width: 21, height: 21, label: "data(label)", "text-margin-y": 7, "text-valign": "bottom", "font-size": 11, color: color("--ink"), "text-outline-width": 2, "text-outline-color": color("--graph-paper") } },
          { selector: "node:selected", style: { "border-width": 4, "border-color": color("--focus") } },
          { selector: "edge", style: { width: 1.4, "line-color": color("--graph-line"), "target-arrow-shape": "triangle", "target-arrow-color": color("--graph-line"), "curve-style": "bezier" } },
          { selector: 'edge[origin = "suggestion"]', style: { "line-style": "dashed", "line-color": "#895f26", "target-arrow-color": "#895f26" } }
        ],
        layout: layout === "cose" ? { name: data.edges.length ? "cose" : "grid", animate: false, fit: true, padding: 52 } : { name: "circle", animate: false, fit: true, padding: 52 },
        minZoom: 0.2, maxZoom: 2.6, wheelSensitivity: 0.22, motionBlur: !media.matches && data.entries.length > 40
      });
      cy.on("tap", "node", event => setSelected(event.target.id()));
      graph.current = cy;
      setError(false);
    } catch { setError(true); }
    function recolor() {
      cy?.style().selector("node").style({ color: color("--ink"), "text-outline-color": color("--graph-paper") })
        .selector("node:selected").style("border-color", color("--focus")).update();
    }
    colorScheme.addEventListener("change", recolor);
    return () => { colorScheme.removeEventListener("change", recolor); cy?.destroy(); graph.current = null; };
  }, [data, layout]);

  useEffect(() => {
    graph.current?.elements(":selected").unselect();
    if (selected) graph.current?.getElementById(selected).select();
  }, [selected, data, layout]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      graph.current?.resize();
      graph.current?.fit(undefined, 52);
    });
    return () => cancelAnimationFrame(frame);
  }, [expanded]);

  const item = data.entries.find(entry => entry.id === selected);
  function zoom(factor: number) {
    const cy = graph.current;
    if (!cy) return;
    const target = Math.max(cy.minZoom(), Math.min(cy.maxZoom(), cy.zoom() * factor));
    const zoom = { level: target, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) cy.zoom(zoom);
    else cy.stop().animate({ zoom }, { duration: 240, easing: "ease-out" });
  }

  return <section className="section-content">
    <div className="section-title"><div><p className="eyebrow">{t("MAPA DEL CONOCIMIENTO", "KNOWLEDGE MAP")}</p><h1>{t("Grafo", "Graph")}</h1></div></div>
    <p className="section-intro">{t("Explora cómo se conectan tus ideas. Las líneas discontinuas marcan sugerencias que has aceptado.", "Explore how your ideas connect. Dashed lines mark suggestions you accepted.")}</p>
    <div className="filters">
      <input aria-label={t("Localizar nodo", "Find node")} placeholder={t("Localizar nodo…", "Find node…")} value={query} onChange={event => setQuery(event.target.value)} />
      <select aria-label={t("Categoría", "Category")} value={filter} onChange={event => setFilter(event.target.value as typeof filter)}><option value="all">{t("Todas las categorías", "All categories")}</option>{kinds.map(kind => <option key={kind} value={kind}>{labels[locale][kind]}</option>)}</select>
      <select aria-label={t("Origen de conexión", "Connection origin")} value={origin} onChange={event => setOrigin(event.target.value)}><option value="all">{t("Todas las conexiones", "All connections")}</option><option value="manual">{t("Manuales", "Manual")}</option><option value="suggestion">{t("Sugerencias aceptadas", "Accepted suggestions")}</option></select>
      <select aria-label={t("Distribución", "Layout")} value={layout} onChange={event => setLayout(event.target.value)}><option value="cose">{t("Orgánica", "Organic")}</option><option value="circle">{t("Circular", "Circular")}</option></select>
      {focus && <button className="secondary" onClick={() => setFocus("")}>{t("Volver al mapa", "Back to map")}</button>}
    </div>
    {data.entries.length === 0 ? <div className="empty"><Network size={24}/><h2>{t("Aquí empieza tu mapa", "Your map begins here")}</h2><p>{t("Los elementos que coincidan con los filtros aparecerán en el grafo.", "Items matching your filters will appear on the graph.")}</p></div> : <>
      <div className="graph-shell" data-expanded={expanded}>
        <div className="graph-canvas" ref={canvas} aria-hidden="true" />
        {error && <p className="error graph-error">{t("El lienzo no está disponible. Puedes usar la lista de nodos.", "The canvas is unavailable. You can use the node list.")}</p>}
        <div className="graph-controls">
          <button className="icon-button" aria-label={t("Acercar", "Zoom in")} onClick={() => zoom(1.25)}><Plus size={17}/></button>
          <button className="icon-button" aria-label={t("Alejar", "Zoom out")} onClick={() => zoom(0.8)}><Minus size={17}/></button>
          <button className="icon-button" aria-label={t("Ampliar lienzo", "Expand canvas")} aria-pressed={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? <Minimize2 size={17}/> : <Maximize2 size={17}/>}</button>
          <button className="icon-button" aria-label={t("Centrar mapa", "Fit graph")} onClick={() => graph.current?.fit(undefined, 52)}><Focus size={17}/></button>
        </div>
      </div>
      <p className="muted graph-count">{data.entries.length} / {data.total} {t("nodos", "nodes")} · {data.edges.length} {t("conexiones visibles", "visible connections")}</p>
      <div className="graph-inspect">
        <div className="node-list" aria-label={t("Lista de nodos", "Node list")}>{data.entries.map(entry => <button type="button" className="node-button" key={entry.id} aria-pressed={selected === entry.id} onClick={() => setSelected(entry.id)}><KindIcon kind={entry.kind}/><span>{entry.title}</span></button>)}</div>
        <div className="node-detail">
          {item ? <><p className="eyebrow">{labels[locale][item.kind]}</p><h2>{item.title}</h2><div className="inline-actions"><button className="primary" onClick={() => open(item.id)}>{t("Abrir original", "Open original")}</button><button className="secondary" onClick={() => { setFocus(item.id); setQuery(""); setFilter("all"); }}>{t("Explorar entorno", "Explore neighbors")}</button></div>
          <ul className="graph-edge-list">{data.edges.filter(edge => edge.from === item.id || edge.to === item.id).map(edge => {
            const neighbor = data.entries.find(entry => entry.id === (edge.from === item.id ? edge.to : edge.from));
            return neighbor && <li key={edge.id}><button className="quiet" onClick={() => setSelected(neighbor.id)}>{edge.from === item.id ? "→ " : "← "}{relationship[locale][edge.predicate]} · {neighbor.title}</button></li>;
          })}</ul></> : <p className="muted">{t("Selecciona un nodo para ver sus conexiones.", "Select a node to inspect its connections.")}</p>}
        </div>
      </div>
    </>}
  </section>;
}
