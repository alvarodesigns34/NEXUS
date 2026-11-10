"use client";

import { useEffect, useId, useRef } from "react";
import { BookOpen, Box, FileText, FolderOpen, Layers3, Lightbulb, Link2, Paperclip, UserRound, X } from "lucide-react";
import { type Locale, labels } from "../lib/copy";
import type { Kind } from "../lib/knowledge";

export const kindIcons = { note: FileText, idea: Lightbulb, project: FolderOpen, concept: Box, person: UserRound, link: Link2, file: Paperclip, collection: Layers3 };

export function KindIcon({ kind }: { kind: Kind }) {
  const Icon = kindIcons[kind] ?? BookOpen;
  return <span className={`kind-icon kind-${kind}`}><Icon size={18} aria-hidden="true" /></span>;
}

export function Dialog({ title, closeLabel, onClose, children, wide = false, variant, action }: { title: string; closeLabel: string; onClose: () => void; children: React.ReactNode; wide?: boolean; variant?: "palette" | "editor"; action?: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
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
  return <dialog ref={ref} className={`dialog${wide ? " wide" : ""}${variant ? " dialog-" + variant : ""}`} aria-labelledby={titleId}
    onCancel={event => { event.preventDefault(); onClose(); }}>
    <header className="dialog-header"><button className="icon-button dialog-close" type="button" aria-label={closeLabel} onClick={onClose}><X size={20} /></button><h2 id={titleId}>{title}</h2><div className="dialog-action">{action}</div></header>
    {children}
  </dialog>;
}

export function EntryKind({ kind, locale }: { kind: Kind; locale: Locale }) {
  return <><KindIcon kind={kind} /><span>{labels[locale][kind]}</span></>;
}
