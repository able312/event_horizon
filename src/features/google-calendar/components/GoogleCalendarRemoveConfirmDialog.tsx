import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/atoms/dialog"
import { Button } from "~/components/atoms/button"

interface GoogleCalendarRemoveConfirmDialogProps {
  open: boolean
  isRemoving: boolean
  onCancel: () => void
  onConfirm: () => void
}

/**
 * Confirms deleting the linked event from the shared Google Calendar.
 * Cancel takes focus so Enter, or clicking through by habit, keeps the Google event.
 */
const GoogleCalendarRemoveConfirmDialog: React.FC<GoogleCalendarRemoveConfirmDialogProps> = ({
  open,
  isRemoving,
  onCancel,
  onConfirm,
}) => (
  <Dialog open={open} onOpenChange={(nextOpen) => (!nextOpen && !isRemoving ? onCancel() : undefined)}>
    <DialogContent showCloseButton={false}>
      <DialogHeader>
        <DialogTitle>Remove from Google Calendar?</DialogTitle>
        <DialogDescription>
          This deletes the event from the shared Google Calendar for everyone and unlinks it. The
          event stays in Event Horizon, and you can add it to Google Calendar again later. To unlink
          it and keep the Google event, use Disconnect instead.
        </DialogDescription>
      </DialogHeader>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel} disabled={isRemoving} autoFocus>
          Cancel
        </Button>
        <Button variant="destructive" onClick={onConfirm} disabled={isRemoving}>
          {isRemoving ? "Removing…" : "Remove from Google Calendar"}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
)

export default GoogleCalendarRemoveConfirmDialog
