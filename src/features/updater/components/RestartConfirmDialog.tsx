import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/atoms/dialog"
import { Button } from "~/components/atoms/button"

interface RestartConfirmDialogProps {
  open: boolean
  version: string
  onCancel: () => void
  onConfirm: () => void
}

export const RestartConfirmDialog: React.FC<RestartConfirmDialogProps> = ({
  open,
  version,
  onCancel,
  onConfirm,
}) => {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (!nextOpen ? onCancel() : undefined)}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Restart to update?</DialogTitle>
          <DialogDescription>
            Event Horizon will close and restart to install v{version}. Any unsaved changes will be
            lost.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Not now
          </Button>
          <Button className="bg-orange-500 text-white hover:bg-orange-400" onClick={onConfirm}>
            Update and restart
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
