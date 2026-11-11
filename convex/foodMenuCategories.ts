import { v } from "convex/values"

import { companyMutation, companyQuery } from "./lib/auth"
import { requireDocument, toRecord } from "./lib/records"

// Categories for the venue's saved food items (Settings → Food Menu). The team names
// them freely: a course ("Mains", "Apps") or a whole menu ("Wedding Menu"). Saved
// items carry them as tags (foodTemplates.categoryIds). Public functions; every
// handler requires a company identity.

function requireName(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) throw new Error("Category name is required")
  return trimmed
}

/** Every category, oldest first; the client sorts them by name. */
export const list = companyQuery({
  args: {},
  handler: async (ctx) => {
    const docs = await ctx.db.query("foodMenuCategories").collect()
    return docs.map(toRecord)
  },
})

export const create = companyMutation({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const id = await ctx.db.insert("foodMenuCategories", { name: requireName(name), createdAt: new Date().toISOString() })
    return toRecord(await requireDocument(ctx, "foodMenuCategories", id))
  },
})

export const update = companyMutation({
  args: { id: v.id("foodMenuCategories"), updates: v.object({ name: v.string() }) },
  handler: async (ctx, { id, updates }) => {
    await requireDocument(ctx, "foodMenuCategories", id)
    await ctx.db.patch("foodMenuCategories", id, { name: requireName(updates.name) })
    return toRecord(await requireDocument(ctx, "foodMenuCategories", id))
  },
})

/** Deletes the category and takes it off every saved food item, in one transaction. */
export const remove = companyMutation({
  args: { id: v.id("foodMenuCategories") },
  handler: async (ctx, { id }) => {
    await requireDocument(ctx, "foodMenuCategories", id)
    const templates = await ctx.db.query("foodTemplates").collect()
    for (const template of templates) {
      if (!template.categoryIds.includes(id)) continue
      await ctx.db.patch("foodTemplates", template._id, {
        categoryIds: template.categoryIds.filter((categoryId) => categoryId !== id),
      })
    }
    await ctx.db.delete("foodMenuCategories", id)
    return true
  },
})
