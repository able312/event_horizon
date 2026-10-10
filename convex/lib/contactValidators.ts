import { v } from "convex/values"
import { contactKind, nullable } from "./validators"

export const contactFields = {
  kind: v.optional(contactKind),
  firstName: v.optional(nullable(v.string())), lastName: v.optional(nullable(v.string())),
  organizationName: v.optional(nullable(v.string())), displayName: v.optional(nullable(v.string())),
  email: v.optional(nullable(v.string())), phone: v.optional(nullable(v.string())), notes: v.optional(nullable(v.string())),
}
export const assignmentFields = {
  vendorCategoryId: v.optional(nullable(v.id("vendorCategories"))),
  roleLabel: v.optional(nullable(v.string())), isPrimary: v.optional(v.boolean()), notes: v.optional(nullable(v.string())),
}
