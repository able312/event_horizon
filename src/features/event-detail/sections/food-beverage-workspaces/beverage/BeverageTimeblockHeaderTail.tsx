import { EllipsisVertical } from "lucide-react"

import { Button } from "~/components/atoms/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/atoms/dropdown-menu"

interface BeverageTimeblockHeaderTailProps {
  deleteTimeblock: () => void
}

export function BeverageTimeblockHeaderTail({ deleteTimeblock }: BeverageTimeblockHeaderTailProps) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="darkSecondary"
          aria-label="Timeblock header actions"
          className="m-0 h-full rounded-none rounded-tr-xs hover:bg-stone-600 hover:text-orange-500"
        >
          <EllipsisVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem variant="destructive" onClick={deleteTimeblock}>
          Delete Timeblock
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
