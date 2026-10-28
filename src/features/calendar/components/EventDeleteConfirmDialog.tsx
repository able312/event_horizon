import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/atoms/dialog"
import { Button } from "~/components/atoms/button"

interface EventDeleteConfirmDialogProps {
  open: boolean
  isDeleting: boolean
  onCancel: () => void
  onConfirm: () => Promise<void>
}

/** Cancel takes focus so Enter, or clicking through by habit, keeps the event. */
const EventDeleteConfirmDialog: React.FC<EventDeleteConfirmDialogProps> = ({
  open,
  isDeleting,
  onCancel,
  onConfirm,
}) => {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (!nextOpen ? onCancel() : undefined)}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Delete event?</DialogTitle>
          <DialogDescription>
            This action cannot be undone. The event and its details will be permanently removed,
            along with its event on the shared Google Calendar if it has one.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={isDeleting} autoFocus>
            Cancel
          </Button>
          <Button variant="destructive" onClick={() => void onConfirm()} disabled={isDeleting}>
            {isDeleting ? "Deleting..." : "Delete event"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default EventDeleteConfirmDialog
