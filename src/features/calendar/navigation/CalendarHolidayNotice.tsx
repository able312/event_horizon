import type { HolidayNotice } from "../lib/calendarHolidays"

type CalendarHolidayNoticeProps = {
  notice: HolidayNotice | null
  onRetry: () => void
  isRetrying: boolean
}

/** One quiet line beside the month controls when the holiday layer can't be trusted. Bookings are unaffected. */
function CalendarHolidayNotice({ notice, onRetry, isRetrying }: CalendarHolidayNoticeProps) {
  if (!notice) return null
  return (
    <p role="status" className="flex items-center gap-1.5 truncate text-xs text-muted-foreground" data-testid="calendar-holiday-notice">
      <span className="truncate">{notice.message}</span>
      {notice.canRetry ? (
        <button
          type="button"
          onClick={onRetry}
          disabled={isRetrying}
          className="shrink-0 rounded px-1 underline underline-offset-2 hover:text-foreground disabled:opacity-50"
        >
          {isRetrying ? "Retrying..." : "Retry"}
        </button>
      ) : null}
    </p>
  )
}

export default CalendarHolidayNotice
