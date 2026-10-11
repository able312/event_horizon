import { useCallback, useMemo, useState } from "react"

/**
 * The fields of `after` whose values differ from `before`. Save handlers send only
 * these, so an edit form never overwrites someone else's change to a field the
 * user didn't touch. Values are compared with Object.is (form payloads hold
 * primitives and null).
 */
export function changedFields<Values extends object>(before: Values, after: Values): Partial<Values> {
  const changes: Partial<Values> = {}
  for (const key of Object.keys(after) as (keyof Values)[]) {
    if (!Object.is(before[key], after[key])) changes[key] = after[key]
  }
  return changes
}

export function hasChanges(changes: object): boolean {
  return Object.keys(changes).length > 0
}

/**
 * Form state over a record that can change while the form is open (live updates
 * from other people). Fields the user hasn't edited show the record's current
 * value; fields they have edited keep what they typed.
 *
 * `source` is the record as form values; memoize it on the record so it only
 * changes when the record does. Remount the form (e.g. `key={record.id}`) to
 * start a fresh draft for a different record.
 */
export function useLiveDraft<Values extends object>(source: Values) {
  const [edits, setEdits] = useState<Partial<Values>>({})
  const values = useMemo<Values>(() => ({ ...source, ...edits }), [source, edits])
  const update = useCallback((patch: Partial<Values>) => setEdits((current) => ({ ...current, ...patch })), [])
  return { values, source, update }
}
