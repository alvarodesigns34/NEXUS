"use client";

import { useEffect, useRef } from "react";
import { BookOpen, Box, FileText, FolderOpen, Layers3, Lightbulb, Link2, Paperclip, UserRound, X } from "lucide-react";
import { type Locale, labels } from "../lib/copy";
import type { Kind } from "../lib/knowledge";

export const kindIcons = { note: FileText, idea: Lightbulb, project: FolderOpen, concept: Box, person: UserRound, link: Link2, file: Paperclip, collection: Layers3 };

export function KindIcon({ kind }: { kind: Kind }) {
  const Icon = kindIcons[kind] ?? BookOpen;
  return <span className={`kind-icon kind-${kind}`}><Icon size={18} aria-hidden="true" /></span>;
}

export function Dialog({ title, closeLabel, onClose, children, wide = false }: { title: string; closeLabel: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement;
    dialog?.showModal();
    dialog?.querySelector<HTMLElement>("[data-initial-focus]")?.focus();
    return () => {
      dialog?.close();
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, []);
  return <dialog ref={ref} className={wide ? "dialog wide" : "dialog"} aria-labelledby="dialog-title"
    onCancel={event => { event.preventDefault(); onClose(); }}>
    <header className="dialog-header"><h2 id="dialog-title">{title}</h2><button className="icon-button" type="button" aria-label={closeLabel} onClick={onClose}><X size={20} /></button></header>
    {children}
  </dialog>;
}

export function EntryKind({ kind, locale }: { kind: Kind; locale: Locale }) {
  return <><KindIcon kind={kind} /><span>{labels[locale][kind]}</span></>;
}

const points = [[27,160],[67,105],[100,197],[125,58],[152,141],[184,220],[200,93],[228,169],[252,49],[282,118],[310,204],[335,69],[359,147],[400,103],[416,190],[456,54],[459,140]];
const connections = [[0,1],[0,2],[1,2],[1,3],[1,4],[2,4],[2,5],[3,4],[3,6],[3,8],[4,5],[4,6],[4,7],[5,7],[6,7],[6,8],[6,9],[7,9],[7,10],[8,9],[8,11],[9,10],[9,11],[9,12],[10,12],[10,14],[11,12],[11,13],[11,15],[12,13],[12,14],[13,14],[13,15],[13,16],[14,16],[15,16]];

export function Constellation() {
  return <svg className="constellation" viewBox="0 0 490 274" fill="none" aria-hidden="true">
    <defs>
      <radialGradient id="aura"><stop stopColor="#bcdb93" stopOpacity=".26"/><stop offset="1" stopColor="#bcdb93" stopOpacity="0"/></radialGradient>
      <pattern id="stars" width="19" height="19" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r=".75" fill="#d4e9b5" opacity=".29"/></pattern>
    </defs>
    <ellipse cx="270" cy="128" rx="219" ry="127" fill="url(#aura)"/>
    <rect x="18" y="8" width="457" height="247" fill="url(#stars)"/>
    <g stroke="#b5d19f" opacity=".22"><ellipse cx="254" cy="132" rx="194" ry="76" transform="rotate(-13 254 132)" strokeDasharray="3 7"/><ellipse cx="254" cy="132" rx="210" ry="98" transform="rotate(-13 254 132)" opacity=".55"/></g>
    {connections.map(([from,to]) => <line key={`${from}-${to}`} x1={points[from][0]} y1={points[from][1]} x2={points[to][0]} y2={points[to][1]} stroke="#d6e9b3" opacity={from === 9 || to === 9 ? ".54" : ".29"} />)}
    {points.map(([x,y],i) => <g key={i}>
      {[4,9,12].includes(i) && <circle cx={x} cy={y} r={i === 9 ? 22 : 13} fill="#cde993" fillOpacity=".12" stroke="#d6edaf" strokeOpacity=".32"/>}
      <circle cx={x} cy={y} r={i === 9 ? 9 : [4,12].includes(i) ? 5 : 2.8} fill={i === 9 ? "#e6ffb5" : "#c2dba1"} opacity={i === 9 ? 1 : .72}/>
    </g>)}
  </svg>;
}
