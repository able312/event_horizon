/** Keep every ID seen this session so optimistic rollback and Undo don't alert again. */
export function detectNewRequestIds(seen: ReadonlySet<string> | null, pendingIds: readonly string[]) {
  const nextSeen = new Set(seen)
  const newIds: string[] = []
  for (const id of pendingIds) {
    if (seen !== null && !nextSeen.has(id)) newIds.push(id)
    nextSeen.add(id)
  }
  return { seen: nextSeen, newIds }
}
