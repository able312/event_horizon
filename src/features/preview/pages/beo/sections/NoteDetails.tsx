import type { TimeblockWithItems } from "~/definitions/timeblocks/timeblocks-types"
import { sortTimeblocksByTime } from "~/features/preview/preferences/selectors"
import { PreviewMarkdownContent } from "~/lib/markdown/PreviewMarkdownContent"

export function NoteTimeblockDetails({ timeblock }: { timeblock: TimeblockWithItems }) {
  return (
    <div className="mb-3 last:mb-0">
      <h3 className="pb-1 text-sm font-bold">{timeblock.title}</h3>
      {timeblock.time || timeblock.assignedTo ? (
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          {timeblock.time ? (
            <>
              <dt className="text-muted-foreground">Time</dt>
              <dd className="font-medium">{timeblock.time}</dd>
            </>
          ) : null}
          {timeblock.assignedTo ? (
            <>
              <dt className="text-muted-foreground">Assigned to</dt>
              <dd className="font-medium">{timeblock.assignedTo}</dd>
            </>
          ) : null}
        </dl>
      ) : null}

      {timeblock.details?.trim() ? (
        <div className="mt-3 border-t pt-3 text-sm">
          <PreviewMarkdownContent source={timeblock.details} />
        </div>
      ) : null}
    </div>
  )
}

type NoteDetailsProps = {
  timeblocks?: TimeblockWithItems[] | null
  selectedIds?: string[]
}

export const NoteDetails = ({ timeblocks, selectedIds }: NoteDetailsProps) => {
  const selectedSet = selectedIds ? new Set(selectedIds) : null
  const sorted = sortTimeblocksByTime(timeblocks).filter((tb) =>
    selectedSet ? selectedSet.has(tb.id) : true,
  )

  if (sorted.length === 0) return null

  return (
    <>
      {sorted.map((timeblock) => (
        <NoteTimeblockDetails key={timeblock.id} timeblock={timeblock} />
      ))}
    </>
  )
}
