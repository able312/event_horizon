import { EllipsisVertical, Plus } from "lucide-react"
import type { ReactNode } from "react"
import { toast } from "sonner"

import { Button } from "~/components/atoms/button"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "~/components/atoms/dropdown-menu"
import type { WorkspaceItemBase } from "./PlanningWorkspaceTimeblockList"
import { useSetupInstructionSection } from "~/hooks/useSetupInstrucionSection"

interface FoodBevHeaderTailProps<TItem extends WorkspaceItemBase> {
  title: string
  addItemLabel: string
  timeblockItems: TItem[]
  deleteTimeblock: () => void
  addItem: () => void
  disabled?: boolean
  extraMenuItems?: ReactNode
}

function FoodBevHeaderTail<TItem extends WorkspaceItemBase>({
  title,
  timeblockItems,
  addItemLabel,
  deleteTimeblock,
  addItem,
  disabled = false,
  extraMenuItems,
}: FoodBevHeaderTailProps<TItem>) {
  const { addSetupInstruction } = useSetupInstructionSection()

  const handlePortToSetup = async () => {
    try {
      const body = timeblockItems
        .map((item) => `## ${item.name}\n# ${item.serviceStyle}\n${item.includes}\n\n`)
        .join("")

      addSetupInstruction({
        title: title + " Setup",
        details: body,
      })

      toast.success("Created " + title + " Setup")
    } catch (err) {
      toast.error("Failed to create setup instructions.")
      console.error(err)
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="darkSecondary"
        className="border-x h-full"
        disabled={disabled}
        onClick={addItem}
      >
        <Plus />
        {addItemLabel}
      </Button>

      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="darkSecondary"
            aria-label="Timeblock header actions"
            disabled={disabled}
            className=" rounded-none rounded-tr-xs h-full m-0 hover:bg-stone-600 hover:text-orange-500"
          >
            <EllipsisVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {extraMenuItems}
          <DropdownMenuItem onClick={handlePortToSetup}>
            Create Setup Instructions Copy
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={deleteTimeblock}>
            Delete Timeblock
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}

export default FoodBevHeaderTail
