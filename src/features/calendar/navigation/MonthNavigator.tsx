import React, { useMemo } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import {
  formatMonthLabel,
  shiftMonthParam,
} from "~/lib/months"

interface MonthNavigatorProps {
  month: string
  onMonthChange: (month: string) => void
  onGoToToday: () => void
}

const MonthNavigator: React.FC<MonthNavigatorProps> = ({
  month,
  onMonthChange,
  onGoToToday,
}) => {
  const monthLabel = useMemo(() => formatMonthLabel(month), [month])

  return (
    <div className="inline-flex items-center gap-4">
      <button
        type="button"
        onClick={onGoToToday}
        className="rounded-md border border-border h-6 px-2 text-sm text-white transition-colors bg-orange-500 hover:bg-orange-400"
      >
        Today
      </button>
      <div className="inline-flex items-center overflow-hidden rounded-md border border-border">
        <button
          type="button"
          onClick={() => onMonthChange(shiftMonthParam(month, -1))}
          className="flex h-6 w-6 items-center justify-center border-r border-border transition-colors hover:bg-stone-100"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => onMonthChange(shiftMonthParam(month, 1))}
          className="flex h-6 w-6 items-center justify-center transition-colors hover:bg-stone-100"
          aria-label="Next month"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
      
      <h2 className="min-w-30 text-md font-semibold">{monthLabel}</h2>
    </div>
  )
}

export default MonthNavigator
