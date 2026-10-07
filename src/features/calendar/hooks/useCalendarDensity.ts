import { useEffect, useLayoutEffect, useState, type RefObject } from "react"
import {
  INITIAL_CALENDAR_DENSITY,
  resolveCalendarDensity,
  type CalendarDensity,
} from "../lib/calendarDensity"

const RESIZE_DEBOUNCE_MS = 100

type GridSize = { width: number; height: number }

/** Measures the grid now, then again (debounced) whenever it resizes. */
function useDebouncedElementSize(ref: RefObject<HTMLElement | null>): GridSize {
  const [size, setSize] = useState<GridSize>({ width: 0, height: 0 })

  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return

    const measure = () => setSize({ width: element.clientWidth, height: element.clientHeight })
    measure()
    if (typeof ResizeObserver === "undefined") return

    let timeout: ReturnType<typeof setTimeout> | undefined
    const observer = new ResizeObserver(() => {
      clearTimeout(timeout)
      timeout = setTimeout(measure, RESIZE_DEBOUNCE_MS)
    })
    observer.observe(element)
    return () => {
      clearTimeout(timeout)
      observer.disconnect()
    }
  }, [ref])

  return size
}

/**
 * Decides which week rows show compact lines instead of full cards.
 * Recalculates on resize, view change (`viewKey`) and whenever the card counts change.
 * Memoise `cardCountsByRow` so it only changes when events do.
 */
export function useCalendarDensity(
  gridRef: RefObject<HTMLElement | null>,
  viewKey: string,
  cardCountsByRow: number[][],
): CalendarDensity {
  const { width, height } = useDebouncedElementSize(gridRef)
  const [density, setDensity] = useState(INITIAL_CALENDAR_DENSITY)

  useEffect(() => {
    setDensity((previous) =>
      resolveCalendarDensity(previous, { viewKey, gridWidth: width, gridHeight: height, cardCountsByRow }),
    )
  }, [viewKey, width, height, cardCountsByRow])

  return density
}
