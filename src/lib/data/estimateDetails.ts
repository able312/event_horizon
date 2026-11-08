import type { EstimateDetails, UpdateEstimateDetails } from "~/definitions/database"
import { api } from "../../../convex/_generated/api"
import { pickFields, runMutation } from "./backend"
import { toId } from "./ids"

/**
 * Creates the event's estimate details if they don't exist yet, then returns them.
 * Reads can't write in Convex, so this is an explicit, idempotent mutation; the
 * cached read then follows `estimateDetails.getByEventId` live (see queries.ts).
 */
export function getOrCreateEstimateDetailsByEventId(eventId: string): Promise<EstimateDetails> {
  return runMutation(api.estimateDetails.ensureByEventId, { eventId: toId<"events">(eventId) })
}

export function updateEstimateDetails(id: string, updates: UpdateEstimateDetails): Promise<EstimateDetails> {
  return runMutation(api.estimateDetails.update, {
    id: toId<"estimateDetails">(id),
    updates: pickFields(updates, [
      "introNote",
      "validUntil",
      "terms",
      "depositKind",
      "depositAmountCents",
      "depositPercent",
      "depositDueDate",
      "depositNote",
    ]),
  })
}
