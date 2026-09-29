import { Button } from "~/components/atoms/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/atoms/dialog"

type ContactDeleteConfirmDialogProps = {
  open: boolean
  contactName: string
  isDeleting: boolean
  onCancel: () => void
  onConfirm: () => Promise<void>
}

export const ContactDeleteConfirmDialog: React.FC<ContactDeleteConfirmDialogProps> = ({
  open,
  contactName,
  isDeleting,
  onCancel,
  onConfirm,
}) => (
  <Dialog open={open} onOpenChange={(nextOpen) => (!nextOpen ? onCancel() : undefined)}>
    <DialogContent showCloseButton={false}>
      <DialogHeader>
        <DialogTitle>Delete {contactName}?</DialogTitle>
        <DialogDescription>
          This action cannot be undone. Contacts with any event history can't be deleted — archive them instead.
        </DialogDescription>
      </DialogHeader>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel} disabled={isDeleting}>
          Cancel
        </Button>
        <Button variant="destructive" onClick={() => void onConfirm()} disabled={isDeleting}>
          {isDeleting ? "Deleting…" : "Delete contact"}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
)
