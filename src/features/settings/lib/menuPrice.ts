import { centsToDollars, dollarsToCents } from "~/features/event-detail/workspace/lib/financial"

/** A price field's text as cents: blank means no price; anything else is rounded and kept non-negative. */
export function parseMenuPrice(value: string): number | null {
  if (!value.trim()) return null
  return Math.max(0, dollarsToCents(value.trim().replace(/^\$/, "")))
}

export function formatMenuPrice(cents: number | null): string {
  return cents == null ? "" : centsToDollars(cents).toFixed(2)
}

/** Underlined, borderless field used in every saved-menu table cell. */
export const MENU_CELL_INPUT_CLASS =
  "h-7 w-full min-w-0 border-0 border-b border-border bg-transparent px-1 text-xs focus:border-primary focus:outline-none"
