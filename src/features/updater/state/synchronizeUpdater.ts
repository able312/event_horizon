import type { UpdaterApi, UpdaterSnapshot, UpdaterStatus } from "../../../definitions/updater"

export function synchronizeUpdater(api: UpdaterApi, onStatus: (status: UpdaterStatus) => void) {
  let active = true
  let revision = -1
  const receive = (snapshot: UpdaterSnapshot) => {
    if (!active || snapshot.revision <= revision) return
    revision = snapshot.revision
    onStatus(snapshot.status)
  }
  const unsubscribe = api.onStatusChanged(receive)
  void api.getStatus().then(receive).catch(() => {
    if (active && revision < 0) onStatus({ phase: "error", message: "Could not read update status. Please reopen the window." })
  })
  return () => {
    active = false
    unsubscribe()
  }
}
