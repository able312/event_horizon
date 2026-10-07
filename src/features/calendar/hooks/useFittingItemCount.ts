import { useLayoutEffect, useState, type RefObject } from "react"
import { countItemsThatFit } from "../lib/dayEventFit"

/**
 * Measures how many of a clipped list's direct children fit inside it, re-measuring on resize.
 * Children past the count should stay in layout (e.g. `invisible`) so their heights are still measurable.
 */
export function useFittingItemCount(listRef: RefObject<HTMLElement | null>, itemCount: number): number {
  const [fittingCount, setFittingCount] = useState(itemCount)

  useLayoutEffect(() => {
    const list = listRef.current
    if (!list) return

    const measure = () => {
      const listTop = list.getBoundingClientRect().top
      const itemBottoms = Array.from(list.children).map(
        (child) => child.getBoundingClientRect().bottom - listTop,
      )
      setFittingCount(countItemsThatFit(list.clientHeight, itemBottoms))
    }

    measure()
    if (typeof ResizeObserver === "undefined") return

    const observer = new ResizeObserver(measure)
    observer.observe(list)
    Array.from(list.children).forEach((child) => observer.observe(child))
    return () => observer.disconnect()
  }, [listRef, itemCount])

  return Math.min(fittingCount, itemCount)
}
