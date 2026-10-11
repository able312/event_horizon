import type { UserSummary } from "~/definitions/database"
import { fetchSource } from "./backend"
import { sources } from "./sources"

/** Every company account; used to name who created or last edited a record. */
export function getUsers(): Promise<UserSummary[]> {
  return fetchSource(sources.users.all())
}
