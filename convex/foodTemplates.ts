import { v } from "convex/values"

import type { Id } from "./_generated/dataModel"
import type { QueryCtx } from "./_generated/server"
import { companyMutation, companyQuery } from "./lib/auth"
import { assertMenuPrice } from "./lib/menuTemplates"
import { assertUpdates, requireDocument, toRecord } from "./lib/records"
import { nullable, pricingBasis } from "./lib/validators"

// The venue's saved food items (Settings → Food Menu), shared by the whole team.
// Picking one while planning a food timeblock copies it into a new food item
// (foodMenuItemFields in the renderer), so editing or deleting a saved item never
// changes an event. Public functions; every handler requires a company identity.

const editableFields = {
  name: v.optional(v.string()),
  unitPriceCents: v.optional(nullable(v.number())),
  pricingBasis: v.optional(pricingBasis),
  clientNotes: v.optional(nullable(v.string())),
  internalNotes: v.optional(nullable(v.string())),
  categoryIds: v.optional(v.array(v.id("foodMenuCategories"))),
}

/** Drops repeats and checks every category still exists. */
async function validCategoryIds(
  ctx: Pick<QueryCtx, "db">,
  categoryIds: Id<"foodMenuCategories">[],
): Promise<Id<"foodMenuCategories">[]> {
  const unique = [...new Set(categoryIds)]
  for (const categoryId of unique) await requireDocument(ctx, "foodMenuCategories", categoryId)
  return unique
}

/** Every saved food item, oldest first; the client groups them by category. */
export const list = companyQuery({
  args: {},
  handler: async (ctx) => {
    const docs = await ctx.db.query("foodTemplates").collect()
    return docs.map(toRecord)
  },
})

export const create = companyMutation({
  args: { ...editableFields, name: v.string() },
  handler: async (ctx, values) => {
    assertMenuPrice(values.unitPriceCents)
    const id = await ctx.db.insert("foodTemplates", {
      name: values.name,
      unitPriceCents: values.unitPriceCents ?? null,
      pricingBasis: values.pricingBasis ?? "each",
      clientNotes: values.clientNotes ?? null,
      internalNotes: values.internalNotes ?? null,
      categoryIds: await validCategoryIds(ctx, values.categoryIds ?? []),
      createdAt: new Date().toISOString(),
    })
    return toRecord(await requireDocument(ctx, "foodTemplates", id))
  },
})

export const update = companyMutation({
  args: { id: v.id("foodTemplates"), updates: v.object(editableFields) },
  handler: async (ctx, { id, updates }) => {
    assertUpdates(updates)
    assertMenuPrice(updates.unitPriceCents)
    await requireDocument(ctx, "foodTemplates", id)
    const patch = updates.categoryIds
      ? { ...updates, categoryIds: await validCategoryIds(ctx, updates.categoryIds) }
      : updates
    await ctx.db.patch("foodTemplates", id, patch)
    return toRecord(await requireDocument(ctx, "foodTemplates", id))
  },
})

export const remove = companyMutation({
  args: { id: v.id("foodTemplates") },
  handler: async (ctx, { id }) => {
    await requireDocument(ctx, "foodTemplates", id)
    await ctx.db.delete("foodTemplates", id)
    return true
  },
})
