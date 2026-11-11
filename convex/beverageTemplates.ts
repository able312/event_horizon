import { v } from "convex/values"

import { companyMutation, companyQuery } from "./lib/auth"
import { assertUpdates, requireDocument, toRecord } from "./lib/records"
import { beverageType, nullable, pricingBasis } from "./lib/validators"

// The venue's saved beverages (Settings → Beverage Menu), shared by the whole team.
// Picking one while planning an event copies it into a new beverage item
// (beverageMenuItemFields in the renderer), so editing or deleting a saved beverage
// never changes an event. Public functions; every handler requires a company identity.

const editableFields = {
  name: v.optional(v.string()),
  type: v.optional(beverageType),
  unitPriceCents: v.optional(nullable(v.number())),
  pricingBasis: v.optional(pricingBasis),
  notes: v.optional(nullable(v.string())),
}

function assertPrice(unitPriceCents: number | null | undefined) {
  if (unitPriceCents == null) return
  if (!Number.isSafeInteger(unitPriceCents) || unitPriceCents < 0) {
    throw new Error("Price must be a whole, non-negative number of cents")
  }
}

/** Every saved beverage, oldest first; the client groups them by type. */
export const list = companyQuery({
  args: {},
  handler: async (ctx) => {
    const docs = await ctx.db.query("beverageTemplates").collect()
    return docs.map(toRecord)
  },
})

export const create = companyMutation({
  args: { ...editableFields, name: v.string(), type: beverageType },
  handler: async (ctx, values) => {
    assertPrice(values.unitPriceCents)
    const id = await ctx.db.insert("beverageTemplates", {
      name: values.name,
      type: values.type,
      unitPriceCents: values.unitPriceCents ?? null,
      pricingBasis: values.pricingBasis ?? "each",
      notes: values.notes ?? null,
      createdAt: new Date().toISOString(),
    })
    return toRecord(await requireDocument(ctx, "beverageTemplates", id))
  },
})

export const update = companyMutation({
  args: { id: v.id("beverageTemplates"), updates: v.object(editableFields) },
  handler: async (ctx, { id, updates }) => {
    assertUpdates(updates)
    assertPrice(updates.unitPriceCents)
    await requireDocument(ctx, "beverageTemplates", id)
    await ctx.db.patch("beverageTemplates", id, updates)
    return toRecord(await requireDocument(ctx, "beverageTemplates", id))
  },
})

export const remove = companyMutation({
  args: { id: v.id("beverageTemplates") },
  handler: async (ctx, { id }) => {
    await requireDocument(ctx, "beverageTemplates", id)
    await ctx.db.delete("beverageTemplates", id)
    return true
  },
})
