import { useState, useCallback, useEffect } from "react"

import SidebarMiniCalendar from "~/features/calendar/navigation/SidebarMiniCalendar"

import { useEventsMonthQuery } from "~/hooks/useEventsMonthQuery"

type CalendarDefaultPanelProps = {
    UrlDate: string,
    setDate: (date: string) => void,
}

const CalendarDefaultPanel: React.FC<CalendarDefaultPanelProps> = ({ UrlDate, setDate }) => {

    const [miniVisibleMonth, setMiniVisibleMonth] = useState<string>(UrlDate)
    const { events: miniMonthEvents } = useEventsMonthQuery(miniVisibleMonth, {
      fetchPolicy: "missing-only",
      staleTime: Number.POSITIVE_INFINITY,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
    })

    useEffect(() => {
        setMiniVisibleMonth(UrlDate)
    }, [UrlDate])


    const handleMiniBrowseMonthChange = useCallback((month: string) => {
        setMiniVisibleMonth(month)
      }, [])
    
      const handleMiniSelectMonth = useCallback(
        (month: string) => {
          setDate(month)
          setMiniVisibleMonth(month)
        },
        [setDate],
      )


    return (
        <div className="flex h-full min-h-0 flex-col">
            <SidebarMiniCalendar
                month={miniVisibleMonth}
                events={miniMonthEvents}
                onBrowseMonthChange={handleMiniBrowseMonthChange}
                onSelectMonth={handleMiniSelectMonth}
            />
        </div>
    )
}

export default CalendarDefaultPanel