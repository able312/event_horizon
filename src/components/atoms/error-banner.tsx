import { Button } from "~/components/atoms/button";
import { X } from "lucide-react";
import { cn } from "~/lib/utils";
import React from "react";

type ListItemProps = React.ComponentProps<"div"> & {
  onClose: () => unknown;
}

function ErrorBanner({ className, children, onClose, ...props }: ListItemProps) {
  return (
    <div
      role="alert"
      data-slot="list-item"
      className={cn("flex flex-row justify-between items-center text-md w-full text-white bg-red-500 rounded-md p-1 pl-4 mb-6", className)}
      {...props}
    >
        { children }
        <Button aria-label="Close error" variant="ghost" className="size-4 rounded-none hover:bg-red-500 hover:text-gray" onClick={ () => onClose() }><X/></Button>
    </div>
  )
}

export { ErrorBanner };