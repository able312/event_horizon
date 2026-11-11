import { useState } from "react"
import { ChevronDown, Plus } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/atoms/dropdown-menu"
import type { BeverageItemType } from "~/definitions/database"
import { ITER_BEVERAGE_TYPE } from "~/definitions/sections/section-constants"

type BeverageMenuAddButtonProps = {
  onAdd: (type: BeverageItemType) => void
}

/** "Add Item" adds a row of the last type chosen; the chevron picks the type. Styled like the event's Drinks card. */
export const BeverageMenuAddButton: React.FC<BeverageMenuAddButtonProps> = ({ onAdd }) => {
  const [lastChosenType, setLastChosenType] = useState<BeverageItemType>("Beer")

  return (
    <div className="inline-flex items-stretch">
      <button
        type="button"
        onClick={() => onAdd(lastChosenType)}
        className="inline-flex items-center gap-1 rounded-l-xs border border-r-0 border-orange-200 bg-orange-100 px-2 py-0.5 text-sm text-orange-700 hover:bg-orange-50"
      >
        <Plus size={14} />
        Add {lastChosenType === "Special Orders" ? "Special Order" : lastChosenType}
      </button>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Choose beverage type"
            className="inline-flex items-center rounded-r-xs border border-orange-200 bg-orange-100 px-2 text-orange-700 hover:bg-orange-50"
          >
            <ChevronDown size={14} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onCloseAutoFocus={(event) => event.preventDefault()}>
          {ITER_BEVERAGE_TYPE.map((type) => (
            <DropdownMenuItem
              key={type}
              onClick={() => {
                setLastChosenType(type)
                onAdd(type)
              }}
            >
              {type}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
