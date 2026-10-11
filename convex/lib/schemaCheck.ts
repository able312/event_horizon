// Checks a plain value against a Convex validator, so the import can report every
// schema violation up front instead of failing mid-write (the deployment rejects a
// whole batch on the first bad row). No runtime imports: Node runs it directly.

/** The parts of a Convex validator the walker reads (the real classes fit this shape). */
export type ValidatorShape = {
  readonly kind: string
  readonly isOptional?: string
  readonly fields?: Readonly<Record<string, ValidatorShape>>
  readonly members?: readonly ValidatorShape[]
  readonly value?: unknown
  readonly element?: ValidatorShape
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

/** What a validator accepts, for "is not one of" messages (nested unions, e.g. nullable enums, are flattened). */
function describe(validator: ValidatorShape): string[] {
  if (validator.kind === "union") return (validator.members ?? []).flatMap(describe)
  return [validator.kind === "literal" ? JSON.stringify(validator.value) : validator.kind === "float64" ? "number" : validator.kind]
}

/**
 * Problems found in `value`, each prefixed with its path (`field`, `grid[1][0]`).
 * `id` validators accept any non-empty string: before references are rewritten they
 * hold legacy IDs. Throws on a validator kind it doesn't know, rather than pass it.
 */
export function checkValue(validator: ValidatorShape, value: unknown, path = ""): string[] {
  const at = (message: string) => [path ? `${path}: ${message}` : message]
  const shown = JSON.stringify(value) ?? String(value)
  switch (validator.kind) {
    case "string": return typeof value === "string" ? [] : at(`${shown} is not a string`)
    case "float64": return typeof value === "number" ? [] : at(`${shown} is not a number`)
    case "boolean": return typeof value === "boolean" ? [] : at(`${shown} is not a boolean`)
    case "null": return value === null ? [] : at(`${shown} is not null`)
    case "id": return typeof value === "string" && value !== "" ? [] : at(`${shown} is not an ID`)
    case "literal": return value === validator.value ? [] : at(`${shown} is not ${JSON.stringify(validator.value)}`)
    case "union": {
      const members = validator.members ?? []
      if (members.some((member) => checkValue(member, value).length === 0)) return []
      // A nullable field: report against the one non-null type (keeps the path into arrays).
      const nonNull = members.filter((member) => member.kind !== "null")
      if (nonNull.length === 1) return checkValue(nonNull[0], value, path)
      return at(`${shown} is not one of ${members.flatMap(describe).join(", ")}`)
    }
    case "array": {
      if (!Array.isArray(value)) return at(`${shown} is not an array`)
      return value.flatMap((item, index) => checkValue(validator.element!, item, `${path}[${index}]`))
    }
    case "object": {
      if (!isPlainObject(value)) return at(`${shown} is not an object`)
      const fields = validator.fields ?? {}
      const problems: string[] = []
      for (const [name, field] of Object.entries(fields)) {
        const fieldPath = path ? `${path}.${name}` : name
        if (value[name] === undefined) {
          if (field.isOptional !== "optional") problems.push(`${fieldPath}: required field is missing`)
        } else problems.push(...checkValue(field, value[name], fieldPath))
      }
      for (const name of Object.keys(value)) if (!(name in fields)) problems.push(`${path ? `${path}.${name}` : name}: unknown field`)
      return problems
    }
    default: throw new Error(`checkValue: unsupported validator kind "${validator.kind}"${path ? ` at ${path}` : ""}`)
  }
}
