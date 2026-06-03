// Components
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "~/components/atoms/dialog";
import type { Dispatch, SetStateAction } from "react";

type EntityDialogProps = {
  entityName: string;
  children: React.ReactNode
  useOpen: readonly [boolean, Dispatch<SetStateAction<boolean>>]
};
  
export const CreateEntityDialog = ({ entityName, children, useOpen }: EntityDialogProps) => {
  
  const [open, setOpen] = useOpen;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create { entityName }</DialogTitle>
        </DialogHeader>
          {children}
      </DialogContent>
    </Dialog>
  )
};