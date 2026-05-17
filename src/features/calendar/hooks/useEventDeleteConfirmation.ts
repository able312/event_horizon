import { useCallback, useState } from "react"

type DeleteEventFn = (eventId: string) => Promise<boolean>

export function useEventDeleteConfirmation(deleteEvent: DeleteEventFn) {
  const [pendingEventId, setPendingEventId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const requestDelete = useCallback((eventId: string) => {
    setPendingEventId(eventId)
  }, [])

  const cancelDelete = useCallback(() => {
    if (isDeleting) return
    setPendingEventId(null)
  }, [isDeleting])

  const confirmDelete = useCallback(async () => {
    if (!pendingEventId || isDeleting) return

    setIsDeleting(true)
    try {
      await deleteEvent(pendingEventId)
    } catch {
      // useEvents handles error toasts; we only control dialog state here.
    } finally {
      setPendingEventId(null)
      setIsDeleting(false)
    }
  }, [deleteEvent, isDeleting, pendingEventId])

  return {
    pendingEventId,
    isOpen: pendingEventId !== null,
    isDeleting,
    requestDelete,
    cancelDelete,
    confirmDelete,
  }
}

export type UseEventDeleteConfirmationReturn = ReturnType<typeof useEventDeleteConfirmation>
