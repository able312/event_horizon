import type { CartDetails, Event, TournamentDetails } from "../../definitions/database.js"
import type { TimeblockWithItems, TimelineMeta, TimelineTimeblock } from "../../definitions/timeblocks/timeblocks-types.js"

const HHMM_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/

type TimelineCandidate = TimeblockWithItems & {
  timelineMeta: TimelineMeta
}

function isValidHHmm(time: string): boolean {
  return HHMM_PATTERN.test(time)
}

function hasStrictTimelineTime<T extends { time: string | null | undefined }>(
  row: T,
): row is T & { time: string } {
  return typeof row.time === "string" && isValidHHmm(row.time)
}

function toSortKeyMinutes(time: string): number {
  const match = HHMM_PATTERN.exec(time)
  if (!match) return Number.MAX_SAFE_INTEGER

  const hours = Number(match[1])
  const minutes = Number(match[2])

  return (hours * 60) + minutes
}

function compareTimelineRows(a: TimelineTimeblock, b: TimelineTimeblock): number {
  const minuteCompare = toSortKeyMinutes(a.time) - toSortKeyMinutes(b.time)
  if (minuteCompare !== 0) return minuteCompare

  const titleCompare = a.title.localeCompare(b.title)
  if (titleCompare !== 0) return titleCompare

  return a.id.localeCompare(b.id)
}

const formatTime = (dateTimeString: string | undefined, timeZone?: string): string | null => {
  if (!dateTimeString) return null

  const date = new Date(dateTimeString)
  if (isNaN(date.getTime())) return null

  if (timeZone) {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).formatToParts(date)
    const time = `${parts.find((part) => part.type === "hour")?.value}:${parts.find((part) => part.type === "minute")?.value}`
    return isValidHHmm(time) ? time : null
  }

  const hours = date.getHours().toString().padStart(2, "0")
  const minutes = date.getMinutes().toString().padStart(2, "0")
  const time = `${hours}:${minutes}`

  return isValidHHmm(time) ? time : null
}

function addTime(timeStr: string, timeToAdd: string): string | null {
  if (!isValidHHmm(timeStr) || !isValidHHmm(timeToAdd)) return null

  const [hours, minutes] = timeStr.split(":").map(Number)
  const [addHours, addMinutes] = timeToAdd.split(":").map(Number)

  const totalMinutes = (hours * 60) + minutes + (addHours * 60) + addMinutes
  const newHours = Math.floor(totalMinutes / 60) % 24
  const newMinutes = totalMinutes % 60

  const nextTime = `${String(newHours).padStart(2, "0")}:${String(newMinutes).padStart(2, "0")}`
  return isValidHHmm(nextTime) ? nextTime : null
}

/** Builds the same timeline for SQLite and Convex. Omit timeZone for desktop local time. */
export function buildTimelineRows({
  event, persistedTimeblocks, rawTournamentDetails, rawCartDetails, timeZone,
}: {
  event: Event
  persistedTimeblocks: TimeblockWithItems[]
  rawTournamentDetails: TournamentDetails | null | undefined
  rawCartDetails: CartDetails | null | undefined
  timeZone?: string
}): TimelineTimeblock[] {
  const persistedTimelineRows: TimelineTimeblock[] = persistedTimeblocks
    .filter(hasStrictTimelineTime)
    .map((timeblock) => ({
      ...timeblock,
      timelineMeta: {
        source: "timeblock",
        isSystem: false,
        isEditable: true,
      },
    }))

  // Synthetic rows have no insertion time; use the event's stable timestamp.
  const createdAt = event.createdAt
  const systemCandidates: TimelineCandidate[] = []

  const eventStartTime = formatTime(event.startDateTime ?? "", timeZone)
  if (eventStartTime) {
    systemCandidates.push({
      id: "fake_timeblock_id_start",
      title: "Event Start",
      assignedTo: null,
      createdAt,
      updatedAt: null,
      details: null,
      eventId: event.id,
      time: eventStartTime,
      sectionType: "note",
      timelineMeta: {
        source: "event_start",
        isSystem: true,
        isEditable: false,
      },
    })
  }

  const eventEndTime = formatTime(event.endDateTime ?? "", timeZone)
  if (eventEndTime) {
    systemCandidates.push({
      id: "fake_timeblock_id_end",
      title: "Event End",
      assignedTo: null,
      createdAt,
      updatedAt: null,
      details: null,
      eventId: event.id,
      time: eventEndTime,
      sectionType: "note",
      timelineMeta: {
        source: "event_end",
        isSystem: true,
        isEditable: false,
      },
    })
  }

  if (event.type === "tournament" && rawTournamentDetails?.time && isValidHHmm(rawTournamentDetails.time)) {
    systemCandidates.push({
      id: "fake_timeblock_id_tournament_start",
      title: `${rawTournamentDetails.startFormat ?? "Tournament"} Start`,
      createdAt,
      updatedAt: null,
      eventId: event.id,
      time: rawTournamentDetails.time,
      sectionType: "tournament_detail",
      assignedTo: `Lead Carts: ${rawTournamentDetails.leadCarts ?? "Not Specified"}`,
      details: `# Details\n${rawTournamentDetails.numberOfPlayers} Players\n${rawTournamentDetails.playFormat ?? ""}\n\n${rawTournamentDetails.notes ?? ""}`,
      timelineMeta: {
        source: "tournament_start",
        isSystem: true,
        isEditable: false,
      },
    })

    const estimatedGolfEnd = addTime(rawTournamentDetails.time, rawTournamentDetails.paceOfPlay ?? "00:00")
    if (estimatedGolfEnd) {
      systemCandidates.push({
        id: "fake_timeblock_id_tournament_end",
        title: "Estimated Golf End",
        assignedTo: null,
        createdAt,
        updatedAt: null,
        details: null,
        eventId: event.id,
        time: estimatedGolfEnd,
        sectionType: "tournament_detail",
        timelineMeta: {
          source: "tournament_end",
          isSystem: true,
          isEditable: false,
        },
      })
    }
  }

  if (event.type === "tournament" && rawCartDetails?.time && isValidHHmm(rawCartDetails.time)) {
    systemCandidates.push({
      id: "fake_timeblock_id_cart_setup",
      title: "Cart Details",
      createdAt,
      updatedAt: null,
      details: null,
      eventId: event.id,
      time: rawCartDetails.time,
      sectionType: "cart_detail",
      assignedTo: `${rawCartDetails.assignedTo ?? ""}`,
      cartDetails: {
        whatGoesOnCarts: rawCartDetails.whatGoesOnCarts,
        customGrid: rawCartDetails.customGrid,
      },
      timelineMeta: {
        source: "cart_detail",
        isSystem: true,
        isEditable: false,
      },
    })
  }

  const systemTimelineRows: TimelineTimeblock[] = systemCandidates.filter(hasStrictTimelineTime)

  return [...persistedTimelineRows, ...systemTimelineRows].sort(compareTimelineRows)
}
