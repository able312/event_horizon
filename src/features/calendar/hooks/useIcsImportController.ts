import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

import type {
  IcsImportCommitResult,
  IcsImportReviewPayload,
} from "~/definitions/events/icsImport"
import { commitIcsImport, onIcsImportReview } from "~/lib/ipc/ipcEventsQueries"
import type { UseEventsReturn } from "~/hooks/useEvents"

export type IcsImportPhase = "idle" | "review" | "committing" | "report"

export function useIcsImportController(eventsHook: UseEventsReturn) {
  const [phase, setPhase] = useState<IcsImportPhase>("idle")
  const [reviewPayload, setReviewPayload] = useState<IcsImportReviewPayload | null>(null)
  const [commitResult, setCommitResult] = useState<IcsImportCommitResult | null>(null)

  useEffect(() => {
    const unsubscribe = onIcsImportReview((payload) => {
      setReviewPayload(payload)
      setCommitResult(null)
      setPhase("review")
    })

    return () => {
      unsubscribe()
    }
  }, [])

  const closeDialog = useCallback(() => {
    if (phase === "committing") return
    setPhase("idle")
    setReviewPayload(null)
    setCommitResult(null)
  }, [phase])

  const commitSelectedRows = useCallback(
    async (selectedRowIds: string[]) => {
      if (!reviewPayload) return

      setPhase("committing")

      try {
        const result = await commitIcsImport({
          sessionId: reviewPayload.sessionId,
          selectedRowIds,
        })

        setCommitResult(result)
        setPhase("report")
        await Promise.all([
          eventsHook.monthQuery.refetch(),
          eventsHook.unscheduledQuery.refetch(),
        ])
        toast.success(`Imported ${result.importedCount} event(s)`)
      } catch {
        toast.error("Failed to import ICS events")
        setPhase("review")
      }
    },
    [eventsHook.monthQuery, eventsHook.unscheduledQuery, reviewPayload],
  )

  return {
    phase,
    reviewPayload,
    commitResult,
    closeDialog,
    commitSelectedRows,
  }
}

export type UseIcsImportControllerReturn = ReturnType<typeof useIcsImportController>
