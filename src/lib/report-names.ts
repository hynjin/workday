export function resolveReportName(
  id: string | null,
  snapshot: string | null,
  currentNames: ReadonlyMap<string, string>,
  empty: string | null = null,
) {
  return (id ? currentNames.get(id) : undefined) ?? snapshot ?? empty;
}

export function reportIdentityKey(id: string | null, resolvedName: string | null, empty: string) {
  return id ?? resolvedName ?? empty;
}
