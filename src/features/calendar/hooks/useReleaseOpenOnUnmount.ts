import { useEffect, useRef } from "react"

/**
 * Reports a controlled popover as closed if it unmounts while open, so the
 * state that owns it (e.g. the grid's one open-popover key) doesn't go stale.
 */
export function useReleaseOpenOnUnmount(open: boolean, onOpenChange: (open: boolean) => void): void {
  const latest = useRef({ open, onOpenChange })

  useEffect(() => {
    latest.current = { open, onOpenChange }
  })

  useEffect(
    () => () => {
      if (latest.current.open) latest.current.onOpenChange(false)
    },
    [],
  )
}
