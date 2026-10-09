import type { Id, TableNames } from "../_generated/dataModel"
import type { DatabaseWriter } from "../_generated/server"

// Who created and who last edited each business record. Mutations never set these
// themselves: companyMutation hands every handler a database writer that stamps
// them, so no write can skip it and no client input can set them.
//
// Every write to an audited table passes through this file, which also makes it
// the place to add a field-level change log later (patch can read the old document
// before writing).

/** Tables whose documents carry createdBy/updatedBy. Link rows and users are not audited. */
export const AUDITED_TABLES = [
  "events",
  "tournamentDetails",
  "cartDetails",
  "payments",
  "touchpoints",
  "menuOfChargeItems",
  "timeblocks",
  "foodItems",
  "beverageItems",
  "contacts",
  "vendorCategories",
  "contactRoles",
  "eventContacts",
] as const satisfies readonly TableNames[]

/**
 * Audited tables that had no `updatedAt` before audit fields existed. The wrapper
 * stamps it (ISO) for them; the others keep setting their own `updatedAt` in the
 * format their records already use.
 */
export const STAMPED_UPDATED_AT_TABLES = [
  "payments",
  "touchpoints",
  "menuOfChargeItems",
  "foodItems",
  "beverageItems",
  "vendorCategories",
  "contactRoles",
] as const satisfies readonly AuditedTable[]

export type AuditedTable = (typeof AUDITED_TABLES)[number]

const audited = new Set<string>(AUDITED_TABLES)
const stampsUpdatedAt = new Set<string>(STAMPED_UPDATED_AT_TABLES)

function auditStamp(table: string, userId: Id<"users">, created: boolean): Record<string, unknown> {
  if (!audited.has(table)) return {}
  const stamp: Record<string, unknown> = created ? { createdBy: userId, updatedBy: userId } : { updatedBy: userId }
  if (stampsUpdatedAt.has(table)) stamp.updatedAt = new Date().toISOString()
  return stamp
}

/** The id-only overloads can't tell which table they write to; every caller uses the table-first form. */
function requireTableForm(method: string, value: object | undefined): asserts value is object {
  if (value === undefined) throw new Error(`db.${method} must name its table so the write can be audited`)
}

/** A database writer that stamps audit fields on every insert, patch and replace. */
export function auditedWriter(db: DatabaseWriter, userId: Id<"users">): DatabaseWriter {
  const insert = (table: TableNames, value: object) =>
    db.insert(table, { ...value, ...auditStamp(table, userId, true) } as never)
  const patch = (table: TableNames, id: Id<TableNames>, value?: object) => {
    requireTableForm("patch", value)
    return db.patch(table, id, { ...value, ...auditStamp(table, userId, false) } as never)
  }
  const replace = (table: TableNames, id: Id<TableNames>, value?: object) => {
    requireTableForm("replace", value)
    return db.replace(table, id, { ...value, ...auditStamp(table, userId, false) } as never)
  }
  const overrides: Record<string | symbol, unknown> = {
    insert,
    patch,
    replace,
    table: () => {
      throw new Error("db.table() bypasses audit stamping; use db.insert/patch with a table name")
    },
  }
  return new Proxy(db, {
    get(target, property, receiver) {
      if (property in overrides) return overrides[property]
      const value: unknown = Reflect.get(target, property, receiver)
      return typeof value === "function" ? value.bind(target) : value
    },
  })
}
