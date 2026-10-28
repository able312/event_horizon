import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/atoms/dialog"
import { Button } from "~/components/atoms/button"
import type { EventStatus } from "~/definitions/database"
import { EVENT_STATUS_LABELS } from "~/definitions/events/ui"
import type { DateRemovalEffects } from "~/lib/events/eventDateRemoval"

interface RemoveEventDateConfirmDialogProps {
  /** What removing the date will also do; the dialog is open while set */
  effects: DateRemovalEffects | null
  /** The status that needs a date, shown in the warning */
  status: EventStatus
  onCancel: () => void
  onConfirm: () => void
}

function describeEffects(effects: DateRemovalEffects, status: EventStatus): string {
  const googleCalendar = "deletes it from the shared Google Calendar. Add it again once it has a date."
  if (!effects.movesToNewLead) return `Removing the date ${googleCalendar}`
  const statusWarning = `This event needs a date while it's ${EVENT_STATUS_LABELS[status]}.`
  return effects.removesFromGoogleCalendar
    ? `${statusWarning} Removing the date moves it back to New Lead and ${googleCalendar}`
    : `${statusWarning} Removing the date moves it back to New Lead.`
}

/**
 * Warns before removing the date from an event whose status needs one, or that is on
 * the shared Google Calendar. Cancel takes focus so Enter, or clicking through by
 * habit, keeps the date.
 */
const RemoveEventDateConfirmDialog: React.FC<RemoveEventDateConfirmDialogProps> = ({
  effects,
  status,
  onCancel,
  onConfirm,
}) => (
  <Dialog open={effects !== null} onOpenChange={(nextOpen) => (!nextOpen ? onCancel() : undefined)}>
    <DialogContent showCloseButton={false}>
      <DialogHeader>
        <DialogTitle>Remove the event date?</DialogTitle>
        <DialogDescription>{effects ? describeEffects(effects, status) : null}</DialogDescription>
      </DialogHeader>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel} autoFocus>
          Keep date
        </Button>
        <Button variant="destructive" onClick={onConfirm}>
          {effects?.movesToNewLead ? <>Remove date &amp; move to New Lead</> : "Remove date"}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
)

export default RemoveEventDateConfirmDialog
