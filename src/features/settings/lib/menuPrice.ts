import { centsToDollars, parseDollarsToCents } from "~/features/event-detail/workspace/lib/financial"

/**
 * A price field's text as cents, accepting "$" and thousands commas ("$1,200.50"). Blank means
 * no price (null); unreadable text gives undefined so the caller keeps the existing price rather
 * than saving $0. Readable amounts are rounded and kept non-negative.
 */
export function parseMenuPrice(value: string): number | null | undefined {
  if (!value.trim()) return null
  const cents = parseDollarsToCents(value)
  return cents == null ? undefined : Math.max(0, cents)
}

export function formatMenuPrice(cents: number | null): string {
  return cents == null ? "" : centsToDollars(cents).toFixed(2)
}

/** Underlined, borderless field used in every saved-menu table cell. */
export const MENU_CELL_INPUT_CLASS =
  "h-7 w-full min-w-0 border-0 border-b border-border bg-transparent px-1 text-xs focus:border-primary focus:outline-none"
