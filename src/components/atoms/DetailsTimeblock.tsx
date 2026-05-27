import React from "react"
import { Trash2, Clock } from "lucide-react"
import type { Timeblock, UpdateTimeblock } from "~/definitions/database"

interface DetailsTimeblockProps {
  timeblock: Timeblock
  children: React.ReactNode
  titlePlaceholder: string, 
  onEdit: (id: string, updates: UpdateTimeblock) => void
  onRemove: (id: string) => void
}

const DetailsTimeblock: React.FC<DetailsTimeblockProps> = ({
  timeblock,
  titlePlaceholder = "New Timeblock",
  children,
  onEdit,
  onRemove,
}) => {

  return (
    <div className="border-y-1 border-stone-100 px-2 py-4 flex items-start hover:bg-stone-50 hover:border-stone-200 w-full">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-1.5 mr-4">
            <Clock size={14} className="text-stone-400" />
            <input
              type="time"
              defaultValue={timeblock.time ?? ""}
              onBlur={(e) => onEdit(timeblock.id, { time: e.target.value})}
              className="border-none bg-transparent text-sm font-mono text-stone-600 outline-none"
            />
          </div>
          <button
            onClick={() => onRemove(timeblock.id)}
            className="flex items-center text-xs text-stone-300 hover:text-red-500 p-1" 
          >
            Remove&nbsp;<Trash2 size={16} />
          </button>
        </div>
        
      <div className="flex flex-col gap-2 w-full">

        <input
            type="text"
            defaultValue={timeblock.title ?? null}
            onBlur={(e) => onEdit(timeblock.id, {title: e.target.value})}
            placeholder={titlePlaceholder}
            className="flex-1 px-2 py-1 text-sm border border-stone-200 rounded bg-white w-full"
          />


        <div className="border-b-1 pb-2">
          <input
              type="text"
              defaultValue={timeblock.assignedTo ?? ""}
              onBlur={(e) => onEdit(timeblock.id, {assignedTo: e.target.value})}
              placeholder={"Assign to..."}
              className="flex-1 px-2 py-1 text-sm border border-stone-200 rounded bg-white w-full"
          />
        </div>

        {children}

      </div>
      
    </div>
  )
}

export default DetailsTimeblock
