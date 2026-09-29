import { Button } from "~/components/atoms/button"
import { CalendarX2, Plus, Search, Users } from 'lucide-react'
import { useNavigate } from "react-router"

interface CalendarDefaultHeaderProps {
  onOpenSearch: () => void
  onOpenCreate: () => void
  onToggleUnscheduledView: () => void
  isUnscheduledActive?: boolean
}

const CalendarDefaultPanelHeader: React.FC<CalendarDefaultHeaderProps> = ({
  onOpenSearch,
  onOpenCreate,
  onToggleUnscheduledView,
  isUnscheduledActive = false,
}) => {
  const navigate = useNavigate()

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => navigate("/contacts")}
        className="text-white transition-colors"
        aria-label="Open contacts"
      >
        <Users className="h-6 w-6" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggleUnscheduledView}
        className={isUnscheduledActive ? "text-orange-500 transition-colors" : "text-white transition-colors"}
        aria-label="Toggle unscheduled events list"
      >
        <CalendarX2 className="h-6 w-6" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={onOpenSearch}
        className="text-white transition-colors"
        aria-label="Open search"
      >
        <Search className="h-6 w-6" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={onOpenCreate}
        className="text-orange-500 transition-colors"
        aria-label="Create new event"
      >
        <Plus className="h-6 w-6" />
      </Button>
    </>
  )
}

export default CalendarDefaultPanelHeader
