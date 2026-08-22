import { useMemo } from "react"

import type { BeverageItem } from "~/definitions/database"
import { useBeverageSection } from "~/hooks/useBeverageSection"
import {
  formatBeverageItemLine,
  getVisibleBeverageTypeSections,
} from "~/features/event-detail/sections/food-beverage-workspaces/beverage/beverageTypeSections"

export const BeverageDetails = () => {
  const { timeblocks, items } = useBeverageSection()

  const sortedTimeblocks = useMemo(() => {
    return [...timeblocks].sort((a, b) => {
      const timeA = a.time ?? ""
      const timeB = b.time ?? ""
      return timeA.localeCompare(timeB)
    })
  }, [timeblocks])

  const itemsByTimeblockId = useMemo(() => {
    const map = new Map<string, BeverageItem[]>()

    for (const item of items) {
      for (const timeblockId of item.assignedTimeblockIds) {
        const bucket = map.get(timeblockId) ?? []
        bucket.push(item)
        map.set(timeblockId, bucket)
      }
    }

    return map
  }, [items])

  return (
    <>
      {sortedTimeblocks.map((timeblock) => {
        const assignedItems = itemsByTimeblockId.get(timeblock.id) ?? []
        const typeSections = getVisibleBeverageTypeSections(assignedItems, { hideEmptySpecialOrders: true })
          .filter((section) => section.items.length > 0)

        return (
          <div key={timeblock.id} className="">
            <h3 className="pb-1 font-bold text-sm">{timeblock.title}</h3>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm border-b-1 pb-2">
              <dt className="text-muted-foreground">Time</dt>
              <dd className="font-medium">{timeblock.time}</dd>

              <dt className="text-muted-foreground">Assigned to</dt>
              <dd className="font-medium">{timeblock.assignedTo}</dd>
            </dl>

            {timeblock.details ? (
              <div className="mt-3 text-sm">
                <p className="text-muted-foreground mb-1">Notes</p>
                <pre className="font-sans whitespace-pre-wrap">{timeblock.details}</pre>
              </div>
            ) : null}

            {typeSections.length > 0 ? (
              <div className="mt-3 space-y-3">
                {typeSections.map((section) => (
                  <div key={section.type}>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{section.type}</p>
                    <ul className="mt-1 space-y-0.5 text-sm">
                      {section.items.map((item) => (
                        <li key={item.id}>{formatBeverageItemLine(item)}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        )
      })}
    </>
  )
}
