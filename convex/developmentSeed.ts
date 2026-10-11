import { internalMutation } from "./_generated/server"
import { v } from "convex/values"

declare const process: { env: Record<string, string | undefined> }

/** CLI-only synthetic data. The worktree setup enables this only on its local deployment. */
export const seed = internalMutation({
  args: {},
  returns: v.object({ seeded: v.boolean() }),
  handler: async (ctx) => {
    if (process.env.EVENT_HORIZON_LOCAL_SEED !== "enabled") throw new Error("Sample seeding is disabled on this deployment")
    // Never overwrite existing data. The check and inserts share one transaction.
    if (await ctx.db.query("events").first()) return { seeded: false }
    const now = new Date().toISOString()
    for (const [index, title] of ["Sample Charity Tournament", "Sample Wedding Reception"].entries()) {
      const start = new Date()
      start.setUTCDate(start.getUTCDate() + 30 * (index + 1))
      start.setUTCHours(13, 0, 0, 0)
      await ctx.db.insert("events", {
        title, type: index === 0 ? "tournament" : "wedding", status: index === 0 ? "confirmed" : "new_lead",
        startDateTime: start.toISOString(), endDateTime: new Date(start.getTime() + 8 * 3600000).toISOString(),
        minGuests: 80, maxGuests: 120, guestCountFinal: null, driveFolderId: null, calendarId: null,
        clientNotes: null, internalNotes: "Synthetic worktree sample", isInternal: 0, createdAt: now, updatedAt: null,
      })
    }
    // Enough contacts to exercise the directory's next-page flow.
    for (let index = 1; index <= 65; index++) {
      const number = String(index).padStart(2, "0")
      const contactId = await ctx.db.insert("contacts", {
        kind: "individual", firstName: "Sample", lastName: `Contact ${number}`, organizationName: null,
        displayName: `Sample Contact ${number}`, email: `sample${number}@example.test`, emailNormalized: `sample${number}@example.test`,
        phone: null, notes: "Synthetic worktree sample", archivedAt: null, createdAt: now, updatedAt: now,
      })
      await ctx.db.insert("contactRoles", { contactId, role: "client", vendorCategoryId: null, createdAt: now })
    }
    return { seeded: true }
  },
})
