import { centsToDollars, dollarsToCents } from "~/features/event-detail/workspace/lib/financial"

/** A price field's text as cents: blank means no price; anything else is rounded and kept non-negative. */
export function parseMenuPrice(value: string): number | null {
  if (!value.trim()) return null
  return Math.max(0, dollarsToCents(value.trim().replace(/^\$/, "")))
}

export function formatMenuPrice(cents: number | null): string {
  return cents == null ? "" : centsToDollars(cents).toFixed(2)
}
