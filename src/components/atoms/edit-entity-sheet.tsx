import type { Dispatch, SetStateAction } from "react";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "~/components/atoms/sheet";

type EntitySheetProps = {
  entityName: string;
  useOpen: readonly [boolean, Dispatch<SetStateAction<boolean>>]
  children: React.ReactNode
};

export function EditEntitySheet({ entityName, useOpen, children }: EntitySheetProps) {
  
  const [open, setOpen] = useOpen;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent className="p-4">
        <SheetHeader>
          <SheetTitle>Edit {entityName}</SheetTitle>
        </SheetHeader>
        { children }
      </SheetContent>
    </Sheet>
  );
}