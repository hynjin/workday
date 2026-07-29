"use client";

import { useState, useTransition, type MouseEvent } from "react";
import { useRouter } from "next/navigation";

export function ProjectRailLinks({ projects, selectedId }: { projects: { id: string; title: string; color: string; taskCount: number }[]; selectedId?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [nextId, setNextId] = useState<string>();
  const select = (event: MouseEvent<HTMLAnchorElement>, id: string) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    setNextId(id);
    startTransition(() => router.push(`/projects?project=${id}`, { scroll: false }));
  };
  return <nav aria-busy={pending}>{projects.map(project => <a className={(nextId ?? selectedId) === project.id ? "is-active" : ""} href={`/projects?project=${project.id}`} onClick={event => select(event, project.id)} key={project.id}><span><i className={`wd-dot ${project.color}`}/><b>{project.title}</b></span><small>{pending && nextId === project.id ? "…" : project.taskCount}</small></a>)}</nav>;
}
