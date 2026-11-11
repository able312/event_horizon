import { useCallback, useEffect, useLayoutEffect, useRef } from "react"

/**
 * Moves the cursor into a newly added row's first field once the row renders.
 *
 * Call the returned function with the new row's client ID as you add it. The field is
 * focused when `rows` changes (the optimistic row appears), with two animation-frame
 * retries for rows that render late. If the user moves focus elsewhere first, the
 * pending focus is dropped so a late render never steals it back.
 *
 * `findField` must be stable (define it outside the component).
 */
export function usePendingRowFocus(findField: (rowId: string) => HTMLElement | null, rows: unknown) {
  const pendingIdRef = useRef<string | null>(null)

  const focusPending = useCallback(() => {
    const pendingId = pendingIdRef.current
    if (!pendingId) return
    const field = findField(pendingId)
    if (!field || document.activeElement === field) return
    field.focus()
  }, [findField])

  useLayoutEffect(() => {
    focusPending()
  }, [rows, focusPending])

  useEffect(() => {
    const clearIfUserMovedOn = (event: FocusEvent) => {
      const pendingId = pendingIdRef.current
      if (!pendingId) return

      const target = event.target
      if (!(target instanceof HTMLElement)) return
      if (target === document.body || target === document.documentElement) return

      const field = findField(pendingId)
      if (field && target !== field) pendingIdRef.current = null
    }

    document.addEventListener("focusin", clearIfUserMovedOn)
    return () => document.removeEventListener("focusin", clearIfUserMovedOn)
  }, [findField])

  return useCallback((rowId: string) => {
    pendingIdRef.current = rowId
    requestAnimationFrame(() => {
      focusPending()
      requestAnimationFrame(focusPending)
    })
  }, [focusPending])
}
