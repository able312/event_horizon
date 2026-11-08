import type { Doc } from "../_generated/dataModel"
import { toRecord } from "./records"

// Estimate fields added after production had data, so stored documents may lack them:
// - `isAddOn` on food items, beverage items and (food) timeblocks: an optional add-on
//   offered on the estimate and left out of its totals until the client accepts it.
//   Missing means false.
// - `packagePricePerPersonCents` on timeblocks: a per-person price for a food timeblock
//   that replaces the sum of its per-person items' prices on the estimate. Missing means
//   none (null).
// - `packageQuantity` on timeblocks: the final number of portions the invoice bills the
//   package price for. Missing means not set yet (null); the invoice then flags the package.
// Records sent to clients always include them. `*:backfillAddOn` and
// `timeblocks:backfillEstimateFields` fill them in; they can become required once those
// have run everywhere.

export const DEFAULT_IS_ADD_ON = false

export function storedIsAddOn(doc: { isAddOn?: boolean }): boolean {
  return doc.isAddOn ?? DEFAULT_IS_ADD_ON
}

/** Defaults the timeblock backfill sets and new timeblocks start with. */
export const TIMEBLOCK_ESTIMATE_DEFAULTS = {
  isAddOn: DEFAULT_IS_ADD_ON,
  packagePricePerPersonCents: null,
  packageQuantity: null,
} as const

/** A timeblock as a record. Every query or mutation returning timeblocks should use this. */
export function toTimeblockRecord(doc: Doc<"timeblocks">) {
  return {
    ...toRecord(doc),
    isAddOn: storedIsAddOn(doc),
    packagePricePerPersonCents: doc.packagePricePerPersonCents ?? null,
    packageQuantity: doc.packageQuantity ?? null,
  }
}

/** A package price is null (none) or a whole number of cents, 0 or more. */
export function assertPackagePrice(packagePricePerPersonCents: number | null | undefined): void {
  if (packagePricePerPersonCents == null) return
  if (!Number.isInteger(packagePricePerPersonCents) || packagePricePerPersonCents < 0) {
    throw new Error("timeblocks: packagePricePerPersonCents must be a whole number of cents, 0 or more")
  }
}

/** A package quantity is null (not set) or a whole number, 0 or more. */
export function assertPackageQuantity(packageQuantity: number | null | undefined): void {
  if (packageQuantity == null) return
  if (!Number.isInteger(packageQuantity) || packageQuantity < 0) {
    throw new Error("timeblocks: packageQuantity must be a whole number, 0 or more")
  }
}
