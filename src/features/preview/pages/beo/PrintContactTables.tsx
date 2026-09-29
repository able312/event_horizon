import type { EventContactsPanelGroup } from "~/definitions/contacts"
import { describePrintTitle, PRINT_ROLE_HEADINGS } from "~/features/contacts/lib/eventContactsPanel"

type PrintContactTablesProps = {
  groups: EventContactsPanelGroup[]
}

/** One compact table per role, so everyone worth contacting about the event is readable at a glance. */
export function PrintContactTables({ groups }: PrintContactTablesProps) {
  return (
    <div className="space-y-3">
      {groups.map((group) => (
        <table key={group.role} className="w-full table-fixed border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-stone-300 text-xs text-muted-foreground">
              <th className="w-1/4 py-1 pr-2 font-semibold">{PRINT_ROLE_HEADINGS[group.role]}</th>
              <th className="w-1/4 py-1 pr-2 font-semibold">Name</th>
              <th className="w-1/4 py-1 pr-2 font-semibold">Phone</th>
              <th className="w-1/4 py-1 font-semibold">Email</th>
            </tr>
          </thead>
          <tbody>
            {group.items.map((item) => (
              <tr key={item.eventContactId} className="border-b border-stone-200 align-top last:border-b-0">
                <td className="py-1 pr-2 text-muted-foreground">{describePrintTitle(item)}</td>
                <td className="py-1 pr-2 font-medium">{item.displayName}</td>
                <td className="py-1 pr-2">{item.phone}</td>
                <td className="break-all py-1">{item.email}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ))}
    </div>
  )
}
