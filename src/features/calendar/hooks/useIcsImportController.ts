import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

import type {
  IcsImportCommitResult,
  IcsImportReviewPayload,
} from "~/definitions/events/icsImport"
import { onIcsImportReview } from "~/lib/ipc/icsImport"
import { commitIcsImport, reviewIcsImport } from "../lib/icsImport"

type IcsImportPhase = "idle" | "review" | "committing" | "report"

export function useIcsImportController() {
  const [phase, setPhase] = useState<IcsImportPhase>("idle")
  const [reviewPayload, setReviewPayload] = useState<IcsImportReviewPayload | null>(null)
  const [commitResult, setCommitResult] = useState<IcsImportCommitResult | null>(null)

  useEffect(() => {
    let active = true

    const unsubscribe = onIcsImportReview((parsed) => {
      reviewIcsImport(parsed)
        .then((payload) => {
          if (!active) return
          setReviewPayload(payload)
          setCommitResult(null)
          setPhase("review")
        })
        .catch((err: unknown) => {
          console.error("Failed to check ICS rows against existing events:", err)
          if (active) toast.error("Failed to check imported events for duplicates")
        })
    })

    return () => {
      active = false
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
        const result = await commitIcsImport(reviewPayload, selectedRowIds)

        setCommitResult(result)
        setPhase("report")
        toast.success(`Imported ${result.importedCount} event(s)`)
      } catch {
        toast.error("Failed to import ICS events")
        setPhase("review")
      }
    },
    [reviewPayload],
  )

  return {
    phase,
    reviewPayload,
    commitResult,
    closeDialog,
    commitSelectedRows,
  }
}
