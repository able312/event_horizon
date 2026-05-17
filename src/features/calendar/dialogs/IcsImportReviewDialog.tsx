import React, { useEffect, useMemo, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog"
import { Button } from "~/components/ui/button"
import type {
  IcsImportCommitResult,
  IcsImportReviewPayload,
  IcsImportReviewRow,
} from "~/definitions/events/icsImport"
import { EVENT_STATUS_LABELS } from "~/definitions/events/ui"
import { formatDate, formatTime } from "~/lib/formatters"

type IcsImportDialogPhase = "idle" | "review" | "committing" | "report"

interface IcsImportReviewDialogProps {
  open: boolean
  phase: IcsImportDialogPhase
  reviewPayload: IcsImportReviewPayload | null
  commitResult: IcsImportCommitResult | null
  onClose: () => void
  onCommit: (selectedRowIds: string[]) => Promise<void>
}

function formatRowDate(row: IcsImportReviewRow): string {
  if (!row.startDateTime) return "-"
  return formatDate(row.startDateTime)
}

function formatRowTimeRange(row: IcsImportReviewRow): string {
  if (!row.startDateTime || !row.endDateTime) return "-"
  return `${formatTime(row.startDateTime)} - ${formatTime(row.endDateTime)}`
}

function buildInvalidLabel(row: IcsImportReviewRow): string {
  if (row.status === "duplicate_calendar_id") return "Duplicate calendarId"
  if (row.status === "skipped_past") return "Past event"
  if (row.status === "skipped_recurring") return "Recurring event (MVP skip)"
  if (row.status !== "invalid") return ""

  switch (row.invalidReason) {
    case "missing_uid":
      return "Missing UID"
    case "missing_title":
      return "Missing title"
    case "missing_start":
      return "Missing DTSTART"
    case "missing_end":
      return "Missing DTEND"
    case "end_before_start":
      return "End before start"
    default:
      return "Invalid event"
  }
}

const IcsImportReviewDialog: React.FC<IcsImportReviewDialogProps> = ({
  open,
  phase,
  reviewPayload,
  commitResult,
  onClose,
  onCommit,
}) => {
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set())

  const importableRows = useMemo(() => {
    if (!reviewPayload) return []
    return reviewPayload.rows.filter(
      (row) => row.status === "valid" || row.status === "duplicate_calendar_id",
    )
  }, [reviewPayload])

  const selectableValidRows = useMemo(() => {
    return importableRows.filter((row) => row.status === "valid")
  }, [importableRows])

  const skippedRows = useMemo(() => {
    if (!reviewPayload) return []
    return reviewPayload.rows.filter((row) => row.status !== "valid" && row.status !== "duplicate_calendar_id")
  }, [reviewPayload])

  useEffect(() => {
    if (!reviewPayload) {
      setSelectedRowIds(new Set())
      return
    }

    const defaults = new Set(
      reviewPayload.rows
        .filter((row) => row.status === "valid")
        .map((row) => row.rowId),
    )
    setSelectedRowIds(defaults)
  }, [reviewPayload])

  const handleToggleSelection = (rowId: string) => {
    setSelectedRowIds((current) => {
      const next = new Set(current)
      if (next.has(rowId)) {
        next.delete(rowId)
      } else {
        next.add(rowId)
      }
      return next
    })
  }

  const handleImportAll = async () => {
    await onCommit(selectableValidRows.map((row) => row.rowId))
  }

  const handleImportSelected = async () => {
    await onCommit(Array.from(selectedRowIds))
  }

  const allValidSelected =
    selectableValidRows.length > 0 &&
    selectableValidRows.every((row) => selectedRowIds.has(row.rowId))

  const warningCount = reviewPayload?.summary.possibleDuplicateWarningsCount ?? 0

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (!nextOpen ? onClose() : undefined)}>
      <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-y-auto">
        {phase === "report" ? (
          <>
            <DialogHeader>
              <DialogTitle>ICS Import Complete</DialogTitle>
              <DialogDescription>
                Results for {reviewPayload?.sourceFileName ?? "import"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 text-sm">
              <p>Imported: {commitResult?.importedCount ?? 0}</p>
              <p>Skipped duplicates: {commitResult?.skippedDuplicateCount ?? 0}</p>
              <p>Skipped invalid/past/recurring: {commitResult?.skippedInvalidCount ?? 0}</p>
              <p>Possible duplicate warnings: {commitResult?.possibleDuplicateWarningsCount ?? 0}</p>
            </div>

            {(commitResult?.importedEvents.length ?? 0) > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">Imported events</p>
                <ul className="max-h-48 space-y-1 overflow-y-auto text-sm text-muted-foreground">
                  {commitResult?.importedEvents.map((event) => (
                    <li key={event.id}>
                      {event.title} ({event.startDateTime ? formatDate(event.startDateTime) : "-"})
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <DialogFooter>
              <Button onClick={onClose}>Close</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Review ICS Import</DialogTitle>
              <DialogDescription>
                Review future events from {reviewPayload?.sourceFileName ?? "selected file"} before importing.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 text-sm">
              <p>Valid rows: {reviewPayload?.summary.validCount ?? 0}</p>
              <p>Duplicate UID rows: {reviewPayload?.summary.duplicateCalendarIdCount ?? 0}</p>
              <p>Skipped invalid rows: {reviewPayload?.summary.skippedInvalidCount ?? 0}</p>
              <p>Skipped past rows: {reviewPayload?.summary.skippedPastCount ?? 0}</p>
              <p>Skipped recurring rows: {reviewPayload?.summary.skippedRecurringCount ?? 0}</p>
              <p>Possible duplicate warnings: {warningCount}</p>
            </div>

            <div className="overflow-x-auto border rounded-md">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="px-3 py-2 text-left">Select</th>
                    <th className="px-3 py-2 text-left">Title</th>
                    <th className="px-3 py-2 text-left">Date</th>
                    <th className="px-3 py-2 text-left">Time</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-left">Flags</th>
                  </tr>
                </thead>
                <tbody>
                  {importableRows.map((row) => {
                    const isSelectable = row.status === "valid"
                    const checked = selectedRowIds.has(row.rowId)

                    return (
                      <tr key={row.rowId} className="border-t">
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            disabled={!isSelectable || phase === "committing"}
                            checked={checked && isSelectable}
                            onChange={() => handleToggleSelection(row.rowId)}
                          />
                        </td>
                        <td className="px-3 py-2">{row.title ?? "(Untitled)"}</td>
                        <td className="px-3 py-2">{formatRowDate(row)}</td>
                        <td className="px-3 py-2">{formatRowTimeRange(row)}</td>
                        <td className="px-3 py-2">
                          {row.status === "duplicate_calendar_id"
                            ? "Duplicate (skip)"
                            : EVENT_STATUS_LABELS.new_lead}
                        </td>
                        <td className="px-3 py-2">
                          {row.warnings.possibleDuplicateTitleDate ? "Possible title/date duplicate" : "-"}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {skippedRows.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">Skipped rows</p>
                <ul className="max-h-32 overflow-y-auto text-sm text-muted-foreground space-y-1">
                  {skippedRows.map((row) => (
                    <li key={row.rowId}>
                      {row.title ?? "(Untitled)"}: {buildInvalidLabel(row)}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <DialogFooter>
              <Button variant="outline" onClick={onClose} disabled={phase === "committing"}>
                Cancel
              </Button>
              <Button
                variant="outline"
                onClick={handleImportSelected}
                disabled={phase === "committing" || selectedRowIds.size === 0}
              >
                Import Selected ({selectedRowIds.size})
              </Button>
              <Button
                onClick={handleImportAll}
                disabled={phase === "committing" || selectableValidRows.length === 0}
              >
                Import All Valid ({selectableValidRows.length})
              </Button>
            </DialogFooter>

            {allValidSelected ? null : (
              <p className="text-xs text-muted-foreground">Some valid rows are unselected.</p>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default IcsImportReviewDialog
