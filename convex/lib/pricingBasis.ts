import type { PRICING_BASES } from "../../src/definitions/enums"
import type { Doc } from "../_generated/dataModel"
import type { MutationCtx } from "../_generated/server"
import { toRecord } from "./records"

// Food and beverage items carry a `pricingBasis` (src/definitions/enums.ts PRICING_BASES).
// Items saved before the field existed, and items created by app builds that don't send
// it, have none; that means "each". Records sent to clients always include it.

type PricingBasis = (typeof PRICING_BASES)[number]

export const DEFAULT_PRICING_BASIS: PricingBasis = "each"

type PricedTable = "foodItems" | "beverageItems"

export function storedPricingBasis(doc: { pricingBasis?: PricingBasis }): PricingBasis {
  return doc.pricingBasis ?? DEFAULT_PRICING_BASIS
}

/** A beverage item as a record. Every query or mutation returning beverage items should use this. */
export function toBeverageItemRecord(doc: Doc<"beverageItems">) {
  return { ...toRecord(doc), pricingBasis: storedPricingBasis(doc) }
}

/**
 * One batch of the `*:backfillPricingBasis` migrations: sets "each" on items that have no
 * pricing basis and skips the rest. Not a user edit, so the audit fields are left alone.
 */
export async function backfillPricingBasisBatch(
  ctx: Pick<MutationCtx, "db">,
  table: PricedTable,
  cursor: string | null,
  batchSize: number,
) {
  const batch = await ctx.db.query(table).paginate({ cursor, numItems: batchSize })
  let migrated = 0, skipped = 0
  for (const item of batch.page) {
    if (item.pricingBasis !== undefined) { skipped++; continue }
    await ctx.db.patch(table, item._id, { pricingBasis: DEFAULT_PRICING_BASIS })
    migrated++
  }
  console.log(`${table}:backfillPricingBasis batch: ${migrated} migrated, ${skipped} already done`)
  return { migrated, skipped, isDone: batch.isDone, continueCursor: batch.continueCursor }
}
