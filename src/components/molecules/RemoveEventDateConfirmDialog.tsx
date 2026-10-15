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

interface RemoveEventDateConfirmDialogProps {
  open: boolean
  /** The status that needs a date, shown in the warning */
  status: EventStatus
  onCancel: () => void
  onConfirm: () => void
}

/**
 * Warns before removing the date from an event whose status needs one.
 * Cancel takes focus so Enter, or clicking through by habit, keeps the date.
 */
const RemoveEventDateConfirmDialog: React.FC<RemoveEventDateConfirmDialogProps> = ({
  open,
  status,
  onCancel,
  onConfirm,
}) => (
  <Dialog open={open} onOpenChange={(nextOpen) => (!nextOpen ? onCancel() : undefined)}>
    <DialogContent showCloseButton={false}>
      <DialogHeader>
        <DialogTitle>Remove the event date?</DialogTitle>
        <DialogDescription>
          This event needs a date while it's {EVENT_STATUS_LABELS[status]}. Removing the date
          moves it back to New Lead.
        </DialogDescription>
      </DialogHeader>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel} autoFocus>
          Keep date
        </Button>
        <Button variant="destructive" onClick={onConfirm}>
          Remove date &amp; move to New Lead
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
)

export default RemoveEventDateConfirmDialog
