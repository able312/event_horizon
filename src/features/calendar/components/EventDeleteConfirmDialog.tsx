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
            This action cannot be undone. The event and its details will be permanently removed.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={isDeleting}>
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
