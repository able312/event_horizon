// The server assigns record IDs, but some screens show a new row (and focus it)
// before the create returns. Those rows use a client ID until then. This registry
// lets later edits made under the client ID wait for the real one, and gives the row
// a render key that survives the swap, so the focused input isn't remounted.

const pendingCreates = new Map<string, Promise<string>>()
const serverIdByClientId = new Map<string, string>()
const clientIdByServerId = new Map<string, string>()

/**
 * Runs `create` for a row the UI already shows as `clientId`. Until it settles,
 * `resolveRecordId(clientId)` waits for it; afterwards it maps to the server ID.
 */
export async function createWithClientId<Created extends { id: string }>(
  clientId: string | undefined,
  create: () => Promise<Created>,
): Promise<Created> {
  if (!clientId) return create()

  const created = create()
  const serverId = created.then((record) => record.id)
  // The derived promise can reject even when no edit is waiting for it.
  // Mark it handled without changing the rejection seen by waiting edits.
  void serverId.catch(() => undefined)
  pendingCreates.set(clientId, serverId)
  try {
    const record = await created
    serverIdByClientId.set(clientId, record.id)
    clientIdByServerId.set(record.id, clientId)
    return record
  } finally {
    pendingCreates.delete(clientId)
  }
}

/** The server ID for `id`, waiting for its create when `id` is a pending client ID. Rejects if that create failed. */
export async function resolveRecordId(id: string): Promise<string> {
  const pending = pendingCreates.get(id)
  if (pending) return pending
  return serverIdByClientId.get(id) ?? id
}

/** A key that stays the same when a row's client ID is replaced by its server ID. */
export function getRecordRenderKey(id: string): string {
  return clientIdByServerId.get(id) ?? id
}
