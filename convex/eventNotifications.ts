import { ConvexError, v } from "convex/values"
import type { Doc, Id } from "./_generated/dataModel"
import { internalMutation, type QueryCtx } from "./_generated/server"
import { companyMutation, companyQuery, requireCompanyUser, type CompanyMutationCtx } from "./lib/auth"
import { findUser } from "./lib/users"
import { effectiveUserName } from "../src/lib/users/userName"
import { EVENT_NOTIFICATION_RETENTION_DAYS } from "../src/lib/events/eventChangeNotifications"

// The Inbox's "Updates": what teammates changed on the calendar. Everyone sees the
// same notifications, minus their own changes; read and dismissed are per user.

/** The Inbox shows at most this many, newest first. */
const INBOX_LIMIT = 100
const DAY_MS = 24 * 60 * 60 * 1000

function retentionCutoff(now = new Date()): string {
  return new Date(now.getTime() - EVENT_NOTIFICATION_RETENTION_DAYS * DAY_MS).toISOString()
}

async function receiptFor(ctx: Pick<QueryCtx, "db">, userId: Id<"users">, notificationId: Id<"eventNotifications">) {
  return ctx.db.query("eventNotificationReceipts")
    .withIndex("by_user_notification", q => q.eq("userId", userId).eq("notificationId", notificationId))
    .unique()
}

/** The caller's notifications, newest first, without their own changes or the ones they dismissed. */
async function inboxNotifications(ctx: Pick<QueryCtx, "db">, userId: Id<"users"> | null) {
  const recent = await ctx.db.query("eventNotifications")
    .withIndex("by_updatedAt", q => q.gte("updatedAt", retentionCutoff()))
    .order("desc")
    .take(INBOX_LIMIT * 2)
  const shown: Array<{ notification: Doc<"eventNotifications">; read: boolean }> = []
  for (const notification of recent) {
    if (shown.length === INBOX_LIMIT) break
    if (notification.actorId === userId) continue
    const receipt = userId ? await receiptFor(ctx, userId, notification._id) : null
    if (receipt?.state === "dismissed") continue
    shown.push({ notification, read: receipt?.state === "read" })
  }
  return shown
}

export const listForInbox = companyQuery({ args: {}, handler: async ctx => {
  const identity = await requireCompanyUser(ctx)
  const user = await findUser(ctx, identity.subject)
  const actorNames = new Map<Id<"users">, string | null>()
  const result = []
  for (const { notification, read } of await inboxNotifications(ctx, user?._id ?? null)) {
    if (!actorNames.has(notification.actorId)) {
      const actor = await ctx.db.get("users", notification.actorId)
      actorNames.set(notification.actorId, actor ? effectiveUserName(actor) ?? actor.email : null)
    }
    result.push({
      id: notification._id,
      kind: notification.kind,
      eventId: notification.eventId,
      eventTitle: notification.eventTitle,
      eventExists: notification.kind !== "deleted" && (await ctx.db.get("events", notification.eventId)) !== null,
      changes: notification.changes,
      actorName: actorNames.get(notification.actorId) ?? null,
      createdAt: notification.createdAt,
      updatedAt: notification.updatedAt,
      read,
    })
  }
  return result
} })

async function setReceipt(ctx: CompanyMutationCtx, notificationId: Id<"eventNotifications">, state: Doc<"eventNotificationReceipts">["state"]) {
  const existing = await receiptFor(ctx, ctx.userId, notificationId)
  if (existing) {
    if (existing.state !== state) await ctx.db.patch("eventNotificationReceipts", existing._id, { state })
    return
  }
  await ctx.db.insert("eventNotificationReceipts", { notificationId, userId: ctx.userId, state })
}

/** A notification can be pruned or replaced (its event deleted) while someone has it open. */
async function requireNotification(ctx: CompanyMutationCtx, id: Id<"eventNotifications">) {
  const notification = await ctx.db.get("eventNotifications", id)
  if (!notification) throw new ConvexError({ code: "NotFound", message: "This notification is no longer available" })
  return notification
}

export const markRead = companyMutation({ args: { id: v.id("eventNotifications") }, handler: async (ctx, { id }) => {
  await requireNotification(ctx, id)
  const existing = await receiptFor(ctx, ctx.userId, id)
  // Opening a dismissed notification (e.g. while Undo is still offered) doesn't bring it back
  if (existing?.state === "dismissed") return
  await setReceipt(ctx, id, "read")
} })

export const markAllRead = companyMutation({ args: {}, handler: async ctx => {
  for (const { notification, read } of await inboxNotifications(ctx, ctx.userId)) {
    if (!read) await setReceipt(ctx, notification._id, "read")
  }
} })

/** Removes it from the caller's Inbox only. */
export const dismiss = companyMutation({ args: { id: v.id("eventNotifications") }, handler: async (ctx, { id }) => {
  await requireNotification(ctx, id)
  await setReceipt(ctx, id, "dismissed")
} })

/** Undo for a dismiss: back in the caller's Inbox, as read. */
export const restore = companyMutation({ args: { id: v.id("eventNotifications") }, handler: async (ctx, { id }) => {
  await requireNotification(ctx, id)
  await setReceipt(ctx, id, "read")
} })

/** Daily (crons.ts): drops notifications past the retention window, with their receipts. Bounded per run. */
export const pruneOld = internalMutation({ args: {}, handler: async ctx => {
  const expired = await ctx.db.query("eventNotifications").withIndex("by_updatedAt", q => q.lt("updatedAt", retentionCutoff())).take(500)
  for (const notification of expired) {
    for (const receipt of await ctx.db.query("eventNotificationReceipts").withIndex("by_notification", q => q.eq("notificationId", notification._id)).collect()) {
      await ctx.db.delete("eventNotificationReceipts", receipt._id)
    }
    await ctx.db.delete("eventNotifications", notification._id)
  }
  return expired.length
} })
