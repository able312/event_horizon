import type { TimeblockWithItems } from "~/definitions/timeblocks/timeblocks-types"
import { sortTimeblocksByTime } from "~/features/preview/preferences/selectors"
import { PreviewMarkdownContent } from "~/lib/markdown/PreviewMarkdownContent"

type SetupInstructionDetailsProps = {
  timeblocks?: TimeblockWithItems[] | null
  selectedIds?: string[]
}

export const SetupInstructionDetails = ({
  timeblocks,
  selectedIds,
}: SetupInstructionDetailsProps) => {
  const selectedSet = selectedIds ? new Set(selectedIds) : null
  const sorted = sortTimeblocksByTime(timeblocks).filter((tb) =>
    selectedSet ? selectedSet.has(tb.id) : true,
  )

  if (sorted.length === 0) return null

  return (
    <>
      {sorted.map((timeblock) => (
        <div key={timeblock.id} className="mb-3 last:mb-0">
          <h3 className="pb-1 text-sm font-bold">{timeblock.title}</h3>
          {timeblock.time ? (
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              <dt className="text-muted-foreground">Setup Time</dt>
              <dd className="font-medium">{timeblock.time}</dd>
            </dl>
          ) : null}

          {timeblock.details?.trim() ? (
            <div className="mt-3 border-t pt-3 text-sm">
              <p className="mb-1 text-muted-foreground">Instructions</p>
              <PreviewMarkdownContent source={timeblock.details} />
            </div>
          ) : null}
        </div>
      ))}
    </>
  )
}
