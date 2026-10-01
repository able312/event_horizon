import { Button } from "~/components/atoms/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/atoms/tooltip"
import { CalendarX2, CirclePlus, Plus, Search, Users } from 'lucide-react'
import { useNavigate } from "react-router"

interface CalendarDefaultHeaderProps {
  onOpenSearch: () => void
  onOpenCreate: () => void
  onToggleUnscheduledView: () => void
  isUnscheduledActive?: boolean
}

interface HeaderIconButtonProps {
  label: string
  hotkey?: string
  ariaLabel: string
  onClick: () => void
  className: string
  children: React.ReactNode
}

function modifierKeyLabel(): string {
  return navigator.platform.toUpperCase().includes("MAC") ? "⌘" : "Ctrl+"
}

const HeaderIconButton: React.FC<HeaderIconButtonProps> = ({
  label,
  hotkey,
  ariaLabel,
  onClick,
  className,
  children,
}) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        variant="ghost"
        size="icon"
        onClick={onClick}
        className={className}
        aria-label={ariaLabel}
      >
        {children}
      </Button>
    </TooltipTrigger>
    <TooltipContent side="bottom" sideOffset={6}>
      {label}
      {hotkey ? <span className="ml-2 opacity-70">{hotkey}</span> : null}
    </TooltipContent>
  </Tooltip>
)

const CalendarDefaultPanelHeader: React.FC<CalendarDefaultHeaderProps> = ({
  onOpenSearch,
  onOpenCreate,
  onToggleUnscheduledView,
  isUnscheduledActive = false,
}) => {
  const navigate = useNavigate()
  const modifier = modifierKeyLabel()

  return (
    <>
      <HeaderIconButton
        label="Create event"
        hotkey={`${modifier}N`}
        ariaLabel="Create new event"
        onClick={onOpenCreate}
        className="size-8 rounded-md transition-colors hover:bg-orange-600 hover:text-white"
      >
        <CirclePlus className="size-4 text-orange-500" strokeWidth={2.5} />
      </HeaderIconButton>
      <HeaderIconButton
        label="Search events"
        hotkey={`${modifier}F`}
        ariaLabel="Open search"
        onClick={onOpenSearch}
        className="size-8 text-white transition-colors"
      >
        <Search className="h-6 w-6" />
      </HeaderIconButton>
      <HeaderIconButton
        label="Unscheduled events"
        hotkey={isUnscheduledActive ? "Esc" : undefined}
        ariaLabel="Toggle unscheduled events list"
        onClick={onToggleUnscheduledView}
        className={isUnscheduledActive ? "size-8 text-orange-500 transition-colors" : "size-8 text-white transition-colors"}
      >
        <CalendarX2 className="h-6 w-6" />
      </HeaderIconButton>
      <HeaderIconButton
        label="Contacts"
        ariaLabel="Open contacts"
        onClick={() => navigate("/contacts")}
        className="size-8 text-white transition-colors"
      >
        <Users className="h-6 w-6" />
      </HeaderIconButton>
    </>
  )
}

export default CalendarDefaultPanelHeader
