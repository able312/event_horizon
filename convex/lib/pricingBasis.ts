import type { PRICING_BASES } from "../../src/definitions/enums"
import type { Doc } from "../_generated/dataModel"
import type { MutationCtx } from "../_generated/server"
import { backfillMissingFieldsBatch } from "./backfill"
import { storedIsAddOn } from "./estimateFields"
import { toRecord } from "./records"

// Food and beverage items carry a `pricingBasis` (src/definitions/enums.ts PRICING_BASES).
// Items saved before the field existed have none; that means "each". New items created
// without one get NEW_ITEM_PRICING_BASIS. Records sent to clients always include it (and
// `isAddOn`, lib/estimateFields.ts).

type PricingBasis = (typeof PRICING_BASES)[number]

export const DEFAULT_PRICING_BASIS: PricingBasis = "each"

/** The pricing basis a newly created item gets when the caller doesn't choose one. */
export const NEW_ITEM_PRICING_BASIS: PricingBasis = "per_person"

type PricedTable = "foodItems" | "beverageItems"

export function storedPricingBasis(doc: { pricingBasis?: PricingBasis }): PricingBasis {
  return doc.pricingBasis ?? DEFAULT_PRICING_BASIS
}

/** A beverage item as a record. Every query or mutation returning beverage items should use this. */
export function toBeverageItemRecord(doc: Doc<"beverageItems">) {
  return { ...toRecord(doc), pricingBasis: storedPricingBasis(doc), isAddOn: storedIsAddOn(doc) }
}

/**
 * One batch of the `*:backfillPricingBasis` migrations: sets "each" on items that have no
 * pricing basis and skips the rest. Not a user edit, so the audit fields are left alone.
 */
export function backfillPricingBasisBatch(
  ctx: Pick<MutationCtx, "db">,
  table: PricedTable,
  cursor: string | null,
  batchSize: number,
) {
  return backfillMissingFieldsBatch(ctx, table, "backfillPricingBasis", { pricingBasis: DEFAULT_PRICING_BASIS }, cursor, batchSize)
}
