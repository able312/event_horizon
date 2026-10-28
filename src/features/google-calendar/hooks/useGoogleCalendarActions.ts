import { useRef, useState } from "react"
import { toast } from "sonner"

import { BackendError } from "~/lib/data/backend"
import {
  getGoogleCalendarEventUrl,
  pushEventToGoogleCalendar,
  removeEventFromGoogleCalendar,
} from "~/lib/data/googleCalendar"
import { openExternalUrl } from "~/lib/ipc/system"

type PendingAction = "push" | "open" | "remove" | "disconnect" | null

// BackendError messages are written for the user, e.g. why Google Calendar refused
function errorMessage(err: unknown, fallback: string): string {
  return err instanceof BackendError ? err.message : fallback
}

function openInBrowser(eventUrl: string): Promise<void> {
  return openExternalUrl(eventUrl).catch(() => {
    toast.error("Couldn't open Google Calendar")
  })
}

/**
 * The shared Google Calendar actions for one event, each reporting its outcome as a toast.
 * Only one runs at a time. Link changes arrive through the event's live query.
 * `clearLink` saves the event without a calendarId, for disconnecting.
 */
export function useGoogleCalendarActions(eventId: string, isLinked: boolean, clearLink: () => Promise<unknown>) {
  const [pending, setPending] = useState<PendingAction>(null)
  // State only updates on the next render, so a quick double-click would get past it
  const isRunning = useRef(false)

  const run = async (action: Exclude<PendingAction, null>, task: () => Promise<void>) => {
    if (isRunning.current) return
    isRunning.current = true
    setPending(action)
    try {
      await task()
    } finally {
      isRunning.current = false
      setPending(null)
    }
  }

  // Creates or updates the shared calendar event
  const push = () =>
    run("push", async () => {
      try {
        const { eventUrl } = await pushEventToGoogleCalendar(eventId)
        toast.success(isLinked ? "Google Calendar event updated" : "Added to Google Calendar", {
          action: { label: "Open", onClick: () => void openInBrowser(eventUrl) },
        })
      } catch (err) {
        toast.error(errorMessage(err, "Failed to update Google Calendar"))
      }
    })

  const open = () =>
    run("open", async () => {
      try {
        const { eventUrl } = await getGoogleCalendarEventUrl(eventId)
        await openInBrowser(eventUrl)
      } catch (err) {
        toast.error(errorMessage(err, "Couldn't find the Google Calendar event"))
      }
    })

  // Resolves true once the Google event is deleted (or was already gone) and unlinked
  const remove = async (): Promise<boolean> => {
    let removed = false
    await run("remove", async () => {
      try {
        const { deletedFromGoogle } = await removeEventFromGoogleCalendar(eventId)
        toast.success(deletedFromGoogle ? "Removed from Google Calendar" : "Unlinked. The Google event was already gone")
        removed = true
      } catch (err) {
        toast.error(errorMessage(err, "Failed to remove the Google Calendar event"))
      }
    })
    return removed
  }

  // Clears the link only; the Google event stays on the shared calendar
  const disconnect = () =>
    run("disconnect", async () => {
      try {
        await clearLink()
        toast.success("Disconnected. The Google event is still on the shared calendar")
      } catch {
        toast.error("Failed to disconnect the Google Calendar event")
      }
    })

  return {
    push,
    open,
    remove,
    disconnect,
    isPushing: pending === "push",
    isOpening: pending === "open",
    isRemoving: pending === "remove",
    isBusy: pending !== null,
  }
}
