"use client";

import { useRef, useState } from "react";

export function EditableText({ action, idName, id, value, label, className = "" }: {
  action: (formData: FormData) => Promise<void>;
  idName: string;
  id: string;
  value: string;
  label: string;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const begin = () => { setEditing(true); requestAnimationFrame(() => inputRef.current?.focus()); };
  const save = () => { formRef.current?.requestSubmit(); setEditing(false); };
  return <form ref={formRef} action={action} className={`editableText ${className}`}>
    <input type="hidden" name={idName} value={id}/>
    {editing ? <input ref={inputRef} name="title" defaultValue={value} aria-label={label} maxLength={120} onBlur={save} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); event.currentTarget.blur(); } if (event.key === "Escape") setEditing(false); }}/> : <><span>{value}</span><button type="button" className="iconButton" onClick={begin} aria-label={label} title={label}>✎</button></>}
  </form>;
}

export function ConfirmSubmit({ action, fields, children, message }: {
  action: (formData: FormData) => Promise<void>;
  fields: Record<string, string>;
  children: React.ReactNode;
  message: string;
}) {
  return <form action={action} onSubmit={(event) => { if (!window.confirm(message)) event.preventDefault(); }}>{Object.entries(fields).map(([name, value]) => <input key={name} type="hidden" name={name} value={value}/>)}{children}</form>;
}
