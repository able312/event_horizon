import { getWorkspaceCategoryIdForSectionType as getFromPolicy } from "./navPolicy"
import type { TimeblockType } from "~/definitions/timeblocks/timeblocks-types"
import type { WorkspaceCategoryId } from "../types"

/** @deprecated Prefer importing from navPolicy — kept for existing imports */
export function getWorkspaceCategoryIdForSectionType(
  sectionType: TimeblockType | undefined,
): WorkspaceCategoryId | null {
  return getFromPolicy(sectionType)
}
