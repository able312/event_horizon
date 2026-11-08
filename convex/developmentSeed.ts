import { internalMutation, type MutationCtx } from "./_generated/server"
import type { Id } from "./_generated/dataModel"
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

const FINANCIAL_SEED_PREFIX = "Financial Sample:"

/** An ISO timestamp `days` from today (negative for the past) at the given UTC hour. */
function isoDaysFromNow(days: number, hourUtc: number): string {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() + days)
  date.setUTCHours(hourUtc, 0, 0, 0)
  return date.toISOString()
}

type SeedEvent = {
  title: string
  type: "tournament" | "wedding" | "function"
  status: "tentative" | "confirmed" | "closed"
  startDays: number
  minGuests: number
  maxGuests: number
  guestCountFinal: number | null
  notes: string
}

async function insertSeedEvent(ctx: MutationCtx, event: SeedEvent): Promise<Id<"events">> {
  const now = new Date().toISOString()
  const start = isoDaysFromNow(event.startDays, 17)
  return await ctx.db.insert("events", {
    title: `${FINANCIAL_SEED_PREFIX} ${event.title}`, type: event.type, status: event.status,
    startDateTime: start, endDateTime: new Date(new Date(start).getTime() + 6 * 3600000).toISOString(),
    minGuests: event.minGuests, maxGuests: event.maxGuests, guestCountFinal: event.guestCountFinal,
    driveFolderId: null, calendarId: null, clientNotes: null, internalNotes: event.notes,
    isInternal: 0, createdAt: now, updatedAt: null,
  })
}

async function insertSeedTimeblock(
  ctx: MutationCtx,
  eventId: Id<"events">,
  title: string,
  extra: { isAddOn?: boolean; packagePricePerPersonCents?: number | null; packageQuantity?: number | null } = {},
): Promise<Id<"timeblocks">> {
  return await ctx.db.insert("timeblocks", {
    eventId, title, time: "18:00", details: null, sectionType: "food", assignedTo: null,
    createdAt: new Date().toISOString(), updatedAt: null, ...extra,
  })
}

async function insertSeedFood(
  ctx: MutationCtx,
  timeblockId: Id<"timeblocks">,
  name: string,
  quantity: number | null,
  unitPriceCents: number,
  options: { perPerson?: boolean; isAddOn?: boolean } = {},
): Promise<void> {
  await ctx.db.insert("foodItems", {
    timeblockId, name, quantity, serviceStyle: "Buffet", clientNotes: null, internalNotes: null, unitPriceCents,
    pricingBasis: options.perPerson ? "per_person" : "each", isAddOn: options.isAddOn ?? false,
    updatedAt: new Date().toISOString(),
  })
}

async function insertSeedBeverage(
  ctx: MutationCtx,
  eventId: Id<"events">,
  name: string,
  type: "Beer" | "Wine" | "Rails" | "Non-Alcoholic" | "Special Orders",
  quantity: number | null,
  unitPriceCents: number,
  options: { perPerson?: boolean; isAddOn?: boolean } = {},
): Promise<void> {
  const now = new Date().toISOString()
  await ctx.db.insert("beverageItems", {
    eventId, name, quantity, type, serviceStyle: "Consumption Bar", includes: null, unitPriceCents,
    pricingBasis: options.perPerson ? "per_person" : "each", isAddOn: options.isAddOn ?? false, updatedAt: now,
  })
}

async function insertSeedCharge(ctx: MutationCtx, eventId: Id<"events">, name: string, category: "Goods" | "Service" | "Golf" | "Food & Beverage" | "Venue", quantity: number, unitPriceCents: number): Promise<void> {
  await ctx.db.insert("menuOfChargeItems", {
    eventId, name, quantity, category, includes: null, unitPriceCents, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  })
}

async function insertSeedPayment(ctx: MutationCtx, eventId: Id<"events">, amountCents: number, daysAgo: number, receipt: string, notes: string): Promise<void> {
  await ctx.db.insert("payments", {
    eventId, amountCents, date: isoDaysFromNow(-daysAgo, 12).slice(0, 10), recieptNumber: receipt, notes,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  })
}

async function insertSeedEstimateDetails(ctx: MutationCtx, eventId: Id<"events">, details: { deposit: "none" | "amount" | "percent"; amountCents?: number; percent?: number; validDays: number }): Promise<void> {
  const now = new Date().toISOString()
  await ctx.db.insert("estimateDetails", {
    eventId, introNote: "Thank you for considering us for your event.", validUntil: isoDaysFromNow(details.validDays, 12).slice(0, 10),
    terms: null, depositKind: details.deposit, depositAmountCents: details.amountCents ?? null, depositPercent: details.percent ?? null,
    depositDueDate: details.deposit === "none" ? null : isoDaysFromNow(details.validDays, 12).slice(0, 10), depositNote: null,
    createdAt: now, updatedAt: null,
  })
}

/**
 * CLI-only synthetic events that exercise the estimate -> invoice workflow: package prices (with and
 * without a final quantity), add-ons, per-person vs fixed pricing, deposits and partial payments.
 * Safe to run again: it does nothing if the Financial Sample events already exist.
 */
export const seedFinancial = internalMutation({
  args: {},
  returns: v.object({ seeded: v.boolean() }),
  handler: async (ctx) => {
    if (process.env.EVENT_HORIZON_LOCAL_SEED !== "enabled") throw new Error("Sample seeding is disabled on this deployment")
    const existing = await ctx.db.query("events").collect()
    if (existing.some((event) => event.title.startsWith(FINANCIAL_SEED_PREFIX))) return { seeded: false }

    // 1. Wedding: priced package with a final quantity, fixed-price platter, add-ons, 25% deposit, deposit paid.
    const wedding = await insertSeedEvent(ctx, { title: "Wedding (package, add-ons, deposit paid)", type: "wedding", status: "confirmed", startDays: 45, minGuests: 100, maxGuests: 120, guestCountFinal: 110, notes: "Package price with final quantity set; one add-on item and one add-on timeblock." })
    const dinner = await insertSeedTimeblock(ctx, wedding, "Dinner", { packagePricePerPersonCents: 8500, packageQuantity: 110 })
    await insertSeedFood(ctx, dinner, "Plated entree", null, 4500, { perPerson: true })
    await insertSeedFood(ctx, dinner, "Garden salad", null, 1200, { perPerson: true })
    await insertSeedFood(ctx, dinner, "Late-night snack platter", 4, 9500)
    await insertSeedFood(ctx, dinner, "Chocolate fountain", 1, 45000, { isAddOn: true })
    await insertSeedTimeblock(ctx, wedding, "Late-night poutine bar", { isAddOn: true })
    await insertSeedBeverage(ctx, wedding, "Open bar (beer and wine)", "Wine", null, 3200, { perPerson: true })
    await insertSeedBeverage(ctx, wedding, "Champagne toast", "Wine", null, 600, { perPerson: true, isAddOn: true })
    await insertSeedCharge(ctx, wedding, "Ceremony site fee", "Venue", 1, 150000)
    await insertSeedCharge(ctx, wedding, "Event coordinator", "Service", 1, 60000)
    await insertSeedEstimateDetails(ctx, wedding, { deposit: "percent", percent: 25, validDays: 14 })
    await insertSeedPayment(ctx, wedding, 250000, 10, "R-1001", "25% deposit")

    // 2. Tournament: package price but no final quantity yet (invoice shows "Needs a final quantity"), fixed deposit.
    const tournament = await insertSeedEvent(ctx, { title: "Tournament (package quantity missing)", type: "tournament", status: "confirmed", startDays: 20, minGuests: 80, maxGuests: 96, guestCountFinal: null, notes: "Package price set, final package quantity not entered." })
    const lunch = await insertSeedTimeblock(ctx, tournament, "Halfway House Lunch", { packagePricePerPersonCents: 2800, packageQuantity: null })
    await insertSeedFood(ctx, lunch, "Burger and fries", null, 1800, { perPerson: true })
    await insertSeedFood(ctx, lunch, "Veggie tray", 3, 6500)
    const banquet = await insertSeedTimeblock(ctx, tournament, "Awards Banquet")
    await insertSeedFood(ctx, banquet, "Carved prime rib buffet", null, 4200, { perPerson: true })
    await insertSeedBeverage(ctx, tournament, "Beer tickets", "Beer", 200, 700)
    await insertSeedBeverage(ctx, tournament, "Soft drinks", "Non-Alcoholic", null, 250, { perPerson: true })
    await insertSeedCharge(ctx, tournament, "Green fees", "Golf", 96, 8500)
    await insertSeedCharge(ctx, tournament, "Cart rental", "Golf", 48, 4000)
    await insertSeedEstimateDetails(ctx, tournament, { deposit: "amount", amountCents: 500000, validDays: 7 })
    await insertSeedPayment(ctx, tournament, 500000, 5, "R-1002", "Fixed deposit")

    // 3. Corporate function: no package price (everything quantity x price), no deposit, fully paid, closed.
    const corporate = await insertSeedEvent(ctx, { title: "Corporate Function (no package, paid in full)", type: "function", status: "closed", startDays: -14, minGuests: 40, maxGuests: 60, guestCountFinal: 52, notes: "Every item bills quantity x price; paid in two instalments." })
    const buffet = await insertSeedTimeblock(ctx, corporate, "Working Lunch Buffet")
    await insertSeedFood(ctx, buffet, "Sandwich platters", 8, 7500)
    await insertSeedFood(ctx, buffet, "Fruit and dessert trays", 5, 5500)
    await insertSeedBeverage(ctx, corporate, "Coffee and tea service", "Non-Alcoholic", 2, 4500)
    await insertSeedCharge(ctx, corporate, "Boardroom rental", "Venue", 1, 80000)
    await insertSeedCharge(ctx, corporate, "AV equipment", "Goods", 1, 25000)
    await insertSeedEstimateDetails(ctx, corporate, { deposit: "none", validDays: -30 })
    await insertSeedPayment(ctx, corporate, 100000, 30, "R-1003", "First instalment")
    await insertSeedPayment(ctx, corporate, 76500, 12, "R-1004", "Balance paid")

    return { seeded: true }
  },
})
