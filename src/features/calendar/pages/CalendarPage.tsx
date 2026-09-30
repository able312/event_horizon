
import EventsCalendar from "../views/EventsCalendar"
import type { UseEventsQueryStateReturn } from "~/hooks/useEventsQueryState"
import type { Event } from "~/definitions/database"
import { useCalendarPanelState } from "../state/useCalendarPanelState"
import { ACTIONS } from "../state/calendarSidePanelReducer"
import { toIsoForDayUsingCurrentTime } from "~/lib/formatters"
import type { UseEventsReturn } from "~/hooks/useEvents"
import { usePrimaryClients } from "~/hooks/useEventContacts"
import { ClientNamesError } from "../views/ClientNamesError"

interface CalendarPageProps {
    queryState: UseEventsQueryStateReturn
    eventsHook: UseEventsReturn
    onDeleteRequest: (eventId: string) => void
}

const CalendarPage: React.FC<CalendarPageProps> = ({ queryState, eventsHook, onDeleteRequest }) => {

  const {ui, dispatch} = useCalendarPanelState()  
  const { state, setDate } = queryState
  const { monthEvents } = eventsHook
  const primaryClients = usePrimaryClients(monthEvents.map((event) => event.id))

  const handleCalendarDayCellClick = (prefillIso: Date) => {
    dispatch({type: ACTIONS.OPEN_CREATE, prefillIso: toIsoForDayUsingCurrentTime(prefillIso) })
  }
  const handleEditEvent = (event: Event) => {
    dispatch({type: ACTIONS.OPEN_EDIT, event})
  }
  return (
    <>
      <ClientNamesError query={primaryClients} />
      <EventsCalendar
        events={monthEvents}
        clientsByEventId={primaryClients.data}
        date={state.date ?? "null"}
        onDateChange={setDate}
        onDayCellClick={handleCalendarDayCellClick}
        draftPreview={ui.sidebarMode === "create" ? ui.createDraftPreview : null}
        onEventEdit={handleEditEvent}
        onEventDelete={onDeleteRequest}
      />
    </>
  )
}

export default CalendarPage
