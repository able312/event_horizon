/**
 * Which Inbox items are new since the last check, for desktop alerts. The first
 * check (seen = null) only records a baseline, so items already there at startup
 * stay silent. Every ID seen this session is kept so optimistic rollback and Undo
 * don't alert again.
 */
export function detectNewIds(seen: ReadonlySet<string> | null, pendingIds: readonly string[]) {
  const nextSeen = new Set(seen)
  const newIds: string[] = []
  for (const id of pendingIds) {
    if (seen !== null && !nextSeen.has(id)) newIds.push(id)
    nextSeen.add(id)
  }
  return { seen: nextSeen, newIds }
}
