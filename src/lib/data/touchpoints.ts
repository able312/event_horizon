import type {
  IncompleteTouchpointWithEvent,
  NewTouchpoint,
  Touchpoint,
  UpdateTouchpoint,
} from "~/definitions/database"
import { api } from "../../../convex/_generated/api"
import { fetchSource, pickFields, runMutation, runQuery } from "./backend"
import { toId } from "./ids"
import { desktopTimeZone, sources } from "./sources"

const EDITABLE_FIELDS = ["title", "dueDate", "completedAt"] as const

export function getTouchpointsByEventId(eventId: string): Promise<Touchpoint[]> {
  return fetchSource(sources.touchpoints.byEvent(eventId))
}

export function getIncompleteTouchpoints(): Promise<IncompleteTouchpointWithEvent[]> {
  return fetchSource(sources.touchpoints.incomplete())
}

export function getIncompleteTouchpointsByEventId(eventId: string): Promise<Touchpoint[]> {
  return runQuery(api.touchpoints.getIncompleteByEventId, { eventId: toId<"events">(eventId) })
}

export function createTouchpoint(
  eventId: string,
  values?: Partial<Pick<NewTouchpoint, "title" | "dueDate" | "completedAt">>,
): Promise<Touchpoint> {
  return runMutation(api.touchpoints.create, {
    eventId: toId<"events">(eventId),
    ...(values ? { values: pickFields(values, EDITABLE_FIELDS) } : {}),
  })
}

export function updateTouchpoint(id: string, updates: UpdateTouchpoint): Promise<Touchpoint> {
  return runMutation(api.touchpoints.update, {
    id: toId<"touchpoints">(id),
    updates: pickFields(updates, EDITABLE_FIELDS),
  })
}

export function deleteTouchpoint(id: string): Promise<boolean> {
  return runMutation(api.touchpoints.remove, { id: toId<"touchpoints">(id) })
}

/** Due dates are calendar dates in the desktop's time zone. */
export function seedCommonTouchpoints(eventId: string): Promise<Touchpoint[]> {
  return runMutation(api.touchpoints.seedCommon, { eventId: toId<"events">(eventId), timeZone: desktopTimeZone() })
}
