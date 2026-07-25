export type TaskSort = "manual" | "title" | "newest" | "estimate";

export function parseTaskSort(value?: string): TaskSort {
  return value === "title" || value === "newest" || value === "estimate" ? value : "manual";
}

export function sortTasks<T extends { title: string; sortOrder: number; createdAt: Date; estimatedMinutes: number | null }>(tasks: T[], sort: TaskSort) {
  return [...tasks].sort((a, b) => {
    if (sort === "title") return a.title.localeCompare(b.title);
    if (sort === "newest") return b.createdAt.getTime() - a.createdAt.getTime();
    if (sort === "estimate") return (a.estimatedMinutes ?? Number.MAX_SAFE_INTEGER) - (b.estimatedMinutes ?? Number.MAX_SAFE_INTEGER);
    return a.sortOrder - b.sortOrder || a.createdAt.getTime() - b.createdAt.getTime();
  });
}

