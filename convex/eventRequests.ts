import { ConvexError, v } from "convex/values"
import type { Id } from "./_generated/dataModel"
import { internalMutation } from "./_generated/server"
import { companyMutation, companyQuery, type CompanyMutationCtx } from "./lib/auth"
import { contactOperation } from "./lib/contactOperations"
import { toRecord } from "./lib/records"
import { eventType, nullable } from "./lib/validators"
import { createEventWithClient, eventClient, eventInput } from "./events"

const submission = {
  responseId: v.string(), submittedAt: v.string(),
  firstName: v.string(), lastName: v.string(), organizationName: nullable(v.string()), email: v.string(), phone: v.string(),
  eventType, preferredDate: nullable(v.string()), alternateDate: nullable(v.string()), startTime: nullable(v.string()),
  guestCount: v.number(), details: nullable(v.string()), referralSource: nullable(v.string()),
  extraAnswers: v.array(v.object({ question: v.string(), answer: v.string() })),
}

/** Called only by the HTTP route, after the secret and payload are checked. A resent response returns the existing request. */
export const receive = internalMutation({ args: submission, handler: async (ctx, input) => {
  const existing = await ctx.db.query("eventRequests").withIndex("by_responseId", q => q.eq("responseId", input.responseId)).first()
  if (existing) return { id: existing._id, duplicate: true }
  const id = await ctx.db.insert("eventRequests", {
    ...input, receivedAt: new Date().toISOString(), status: "pending", eventId: null, reviewedBy: null, reviewedAt: null,
  })
  return { id, duplicate: false }
} })

// Newest first.
export const listPending = companyQuery({ args: {}, handler: async ctx =>
  (await ctx.db.query("eventRequests").withIndex("by_status", q => q.eq("status", "pending")).order("desc").collect()).map(toRecord),
})

/** Two people can review the same request; only the first decision counts. */
async function requirePending(ctx: CompanyMutationCtx, id: Id<"eventRequests">) {
  const request = await ctx.db.get("eventRequests", id)
  if (!request) throw new ConvexError({ code: "NotFound", message: "Event request not found" })
  if (request.status !== "pending") throw new ConvexError({ code: "AlreadyReviewed", message: `This request was already ${request.status}` })
  return request
}

const reviewed = (ctx: CompanyMutationCtx) => ({ reviewedBy: ctx.userId, reviewedAt: new Date().toISOString() })

export const dismiss = companyMutation({ args: { id: v.id("eventRequests") }, handler: async (ctx, { id }) => {
  await requirePending(ctx, id)
  await ctx.db.patch("eventRequests", id, { status: "dismissed", ...reviewed(ctx) })
} })

// The renderer sends the event as reviewed in the pre-filled create form, so staff
// can correct it first. One transaction: if the event or contact fails (e.g.
// EmailTaken), the request stays pending.
export const accept = companyMutation({ args: { id: v.id("eventRequests"), input: eventInput, client: eventClient }, handler: (ctx, { id, input, client }) => contactOperation(async () => {
  await requirePending(ctx, id)
  const event = await createEventWithClient(ctx, input, client)
  await ctx.db.patch("eventRequests", id, { status: "accepted", eventId: event.id, ...reviewed(ctx) })
  return event
}) })
