import { toast } from "sonner"

export async function restartAndInstall() {
  if (import.meta.env.DEV) {
    toast.info("Simulated update ready. Real installation is disabled in development.")
    return
  }
  try {
    if (!window.api?.updater) throw new Error("Updater bridge unavailable")
    await window.api.updater.restartAndInstall()
  } catch {
    toast.error("Could not restart to update. Please keep working and try again later.")
  }
}
