import type { VenueSettings } from "~/definitions/database"
import { api } from "../../../convex/_generated/api"
import { fetchSource, runMutation } from "./backend"
import { sources } from "./sources"

/** The venue-wide settings, or null before anyone has saved one. */
export function getVenueSettings(): Promise<VenueSettings | null> {
  return fetchSource(sources.venueSettings.get())
}

/** Saves the terms printed on estimates that don't have their own (null clears them). */
export function setDefaultEstimateTerms(terms: string | null): Promise<VenueSettings> {
  return runMutation(api.venueSettings.setDefaultEstimateTerms, { terms })
}
