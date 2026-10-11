import type { CartDetails, UpdateCartDetails } from "~/definitions/database"
import { api } from "../../../convex/_generated/api"
import { pickFields, runMutation } from "./backend"
import { toId } from "./ids"

/**
 * Creates the event's cart details if they don't exist yet, then returns them.
 * Reads can't write in Convex, so this is an explicit, idempotent mutation; the
 * cached read then follows `cartDetails.getByEventId` live (see queries.ts).
 */
export function getOrCreateCartDetailsByEventId(eventId: string): Promise<CartDetails> {
  return runMutation(api.cartDetails.ensureByEventId, { eventId: toId<"events">(eventId) })
}

export function updateCartDetails(id: string, updates: UpdateCartDetails): Promise<CartDetails> {
  return runMutation(api.cartDetails.update, {
    id: toId<"cartDetails">(id),
    updates: pickFields(updates, ["time", "layout", "customGrid", "whatGoesOnCarts", "assignedTo", "rentingCarts"]),
  })
}
