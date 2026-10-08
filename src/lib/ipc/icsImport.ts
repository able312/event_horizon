import type { IcsImportReviewPayload } from "~/definitions/events/icsImport"

export function onIcsImportReview(
  listener: (payload: IcsImportReviewPayload) => void,
): () => void {
  const wrapped = (...args: unknown[]) => {
    const payload = args[0] as IcsImportReviewPayload | undefined
    if (!payload) return
    listener(payload)
  }

  window.electron.ipcRenderer.on("events:import-ics:review", wrapped)

  return () => {
    window.electron.ipcRenderer.removeListener("events:import-ics:review", wrapped)
  }
}
