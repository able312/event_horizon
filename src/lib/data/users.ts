import type { CurrentUser, UserSummary } from "~/definitions/database"
import { api } from "../../../convex/_generated/api"
import { fetchSource, runMutation } from "./backend"
import { sources } from "./sources"

/** Every company account; used to name who created or last edited a record. */
export function getUsers(): Promise<UserSummary[]> {
  return fetchSource(sources.users.all())
}

/** The signed-in account's record, or null until sign-in has stored it. */
export function getCurrentUser(): Promise<CurrentUser | null> {
  return fetchSource(sources.users.current())
}

/** Sets the signed-in user's own name; null or blank goes back to their Google name. */
export function updateCurrentUserName(name: string | null): Promise<CurrentUser> {
  return runMutation(api.users.updateName, { name })
}
