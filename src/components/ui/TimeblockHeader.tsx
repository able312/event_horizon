import React from "react"
import { Trash2, Clock, CircleUserRound } from "lucide-react"

interface TimeblockHeaderProps {
  time: string
  title: string
  assignedTo: string
  placeholder?: string
  onTimeChange: (value: string) => void
  onTitleChange: (value: string) => void
  onAssignmentChange: (value: string) => void
  onRemove: () => void
}

const TimeblockHeader: React.FC<TimeblockHeaderProps> = ({
  time,
  title,
  assignedTo,
  placeholder = "e.g., Dinner, Lunch, Breakfast",
  onTimeChange,
  onTitleChange,
  onAssignmentChange,
  onRemove,
}) => {
  return (
    <>
    <div className="flex items-center gap-3 mb-3">
      <div className="flex items-center gap-1.5">
        <Clock size={14} className="text-stone-400" />
        <input
          type="time"
          defaultValue={time}
          onBlur={(e) => onTimeChange(e.target.value)}
          className="border-none bg-transparent text-sm font-mono text-stone-600 outline-none"
        />
      </div>
      <input
        type="text"
        defaultValue={title}
        onBlur={(e) => onTitleChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 px-2 py-1 text-sm border border-stone-200 rounded bg-white"
      />
      <button
        onClick={onRemove}
        className="text-red-500 hover:text-red-700 p-1"
      >
        <Trash2 size={16} />
      </button>
    </div>
    <div className="flex justify-start items-center ml-18 mr-9 pb-4">
      <p className="text-sm"><CircleUserRound className="h-6 w-6 text-stone-600 mr-2"/></p>
      <input
          type="text"
          defaultValue={assignedTo}
          onBlur={(e) => onAssignmentChange(e.target.value)}
          placeholder={"Assign staff to the task"}
          className="flex-1 px-2 py-1 text-sm border border-stone-200 rounded bg-white"
      />
    </div>
    </>
  )
}

export default TimeblockHeader
