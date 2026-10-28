import { useState } from "react"
import { toast } from "sonner"

import {
  getGoogleCalendarEventUrl,
  pushEventToGoogleCalendar,
  removeEventFromGoogleCalendar,
} from "~/lib/data/googleCalendar"
import { openExternalUrl } from "~/lib/ipc/system"

type PendingAction = "push" | "open" | "remove" | null

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback
}

function openInBrowser(eventUrl: string): Promise<void> {
  return openExternalUrl(eventUrl).catch(() => {
    toast.error("Couldn't open Google Calendar")
  })
}

/**
 * The shared Google Calendar actions for one event, each reporting its outcome as a toast.
 * Only one runs at a time. Link changes arrive through the event's live query.
 */
export function useGoogleCalendarActions(eventId: string, isLinked: boolean) {
  const [pending, setPending] = useState<PendingAction>(null)

  const run = async (action: Exclude<PendingAction, null>, task: () => Promise<void>) => {
    if (pending) return
    setPending(action)
    try {
      await task()
    } finally {
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

  return {
    push,
    open,
    remove,
    isPushing: pending === "push",
    isOpening: pending === "open",
    isRemoving: pending === "remove",
    isBusy: pending !== null,
  }
}
