"use client";

import { useId, useMemo, useState } from "react";
import { ArrowUpRight, Search } from "lucide-react";
import { labels, type Locale } from "../lib/copy";
import { excerpt, search, type Entry } from "../lib/knowledge";
import { Dialog, KindIcon } from "./ui";

export default function SearchPalette({ entries, locale, close, open, showAll }: {
  entries: Entry[]; locale: Locale; close: () => void; open: (id: string) => void; showAll: (query: string) => void;
}) {
  const t = (es: string, en: string) => locale === "es" ? es : en;
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const id = useId();
  const results = useMemo(() => search(entries, query), [entries, query]);
  const visible = results.slice(0, 7);
  const result = visible[index];
  const optionId = (entry: Entry) => `${id}-${entry.id}`;

  return <Dialog title={t("Buscar", "Search")} closeLabel={t("Cerrar búsqueda", "Close search")} onClose={close} variant="palette">
    <div className="palette-content">
      <label className="search-field palette-field"><Search size={21} aria-hidden="true"/><input
        type="search" role="combobox" autoComplete="off" enterKeyHint="search" data-initial-focus
        aria-label={t("Buscar en NEXUS", "Search NEXUS")} aria-controls={id} aria-expanded="true"
        aria-autocomplete="list" aria-activedescendant={result ? optionId(result) : undefined}
        placeholder={t("Una idea, un título, una etiqueta…", "An idea, a title, a tag…")}
        value={query} onChange={event => { setQuery(event.target.value); setIndex(0); }}
        onKeyDown={event => {
          if ((event.key === "ArrowDown" || event.key === "ArrowUp") && visible.length) {
            event.preventDefault();
            const next = (index + (event.key === "ArrowDown" ? 1 : -1) + visible.length) % visible.length;
            setIndex(next);
            document.getElementById(optionId(visible[next]))?.scrollIntoView({ block: "nearest" });
          } else if (event.key === "Enter") {
            event.preventDefault();
            if (result) open(result.id);
          }
        }} /></label>
      <p className="eyebrow palette-label">{query.trim() ? t("Resultados", "Results") : t("Actualizados recientemente", "Recently updated")}</p>
      <ul className="palette-results" id={id} role="listbox" aria-label={t("Resultados de búsqueda", "Search results")}>
        {visible.map((entry, current) => <li role="option" aria-selected={index === current} id={optionId(entry)} key={entry.id}
          onMouseDown={event => event.preventDefault()} onClick={() => open(entry.id)} className="palette-result">
          <KindIcon kind={entry.kind}/><span><strong>{entry.title}</strong><small>{excerpt(entry, query) || labels[locale][entry.kind]}</small></span><ArrowUpRight size={17} aria-hidden="true"/>
        </li>)}
      </ul>
      {!visible.length && <p className="palette-empty muted" role="status">{query.trim() ? t("No hay coincidencias.", "No matches.") : t("Tus primeras notas e ideas aparecerán aquí.", "Your first notes and ideas will appear here.")}</p>}
      <button className="quiet palette-all" onClick={() => showAll(query)}>{t("Ver en Biblioteca", "View in Library")}{results.length > 7 ? ` · ${results.length}` : ""}<ArrowUpRight size={15}/></button>
    </div>
  </Dialog>;
}
