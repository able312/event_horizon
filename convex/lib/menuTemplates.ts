// Shared rules for the venue's saved menu items (beverageTemplates, foodTemplates).

export function assertMenuPrice(unitPriceCents: number | null | undefined): void {
  if (unitPriceCents == null) return
  if (!Number.isSafeInteger(unitPriceCents) || unitPriceCents < 0) {
    throw new Error("Price must be a whole, non-negative number of cents")
  }
}
