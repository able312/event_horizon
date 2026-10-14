import type { IcsImportParsedPayload } from "~/definitions/events/icsImport"

export function onIcsImportReview(
  listener: (payload: IcsImportParsedPayload) => void,
): () => void {
  const wrapped = (...args: unknown[]) => {
    const payload = args[0] as IcsImportParsedPayload | undefined
    if (!payload) return
    listener(payload)
  }

  window.electron.ipcRenderer.on("events:import-ics:review", wrapped)

  return () => {
    window.electron.ipcRenderer.removeListener("events:import-ics:review", wrapped)
  }
}

/** Opens the main-process .ics picker; the chosen file arrives through `onIcsImportReview`. */
export async function openIcsImportPicker(): Promise<void> {
  await window.electron.ipcRenderer.invoke("events:import-ics:open")
}
