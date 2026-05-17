export const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return "-"
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export const formatDateLong = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

export const formatDateMonthDay = (dateStr: string | null): string => {
  if (!dateStr) return "-"
  const date = new Date(dateStr)
  const month = date.toLocaleDateString("en-US", { month: "long" })
  const day = date.getDate()
  const year = date.getFullYear()
  
  const getOrdinal = (n: number) => {
    const s = ["th", "st", "nd", "rd"]
    const v = n % 100
    return n + (s[(v - 20) % 10] || s[v] || s[0])
  }
  
  return `${month} ${getOrdinal(day)}, ${year}`
}

export const isSameDay = (date1: string, date2: string): boolean => {
  const d1 = new Date(date1)
  const d2 = new Date(date2)
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  )
}

export const formatTime = (dateStr: string): string => {
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  })
}

export const formatCurrency = (cents: number | null): string => {
  if (!cents) return "-"
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100)
}

export const getDateString = (start: string, end: string): string => {
    const startDate = formatDate(start)
    const endDate = formatDate(end)
    const startTime = formatTime(start)
    const endTime = formatTime(end)

    return `${startDate} | ${startTime} - ${startDate !== endDate ? endDate + " | " : ""} ${endTime}`
}

export const parseNote = (str: string) => {
  let blockHeader = null;
  let blockSubtitle = null;
  let blockNotes = null;

  const lines = str.split('\n');
  const noteLines = [];

  for (const line of lines) {
    if (line.startsWith('## ')) {
      blockHeader = line.slice(3).trim();
    } else if (line.startsWith('# ')) {
      blockSubtitle = line.slice(2).trim();
    } else if (line.trim() !== '') {
      noteLines.push(line.trim());
    }
  }

  if (noteLines.length > 0) {
    blockNotes = noteLines.join('\n');
  }

  return { blockHeader, blockSubtitle, blockNotes };
}


export function toIsoForDayUsingCurrentTime(day: Date): string {
  const now = new Date()
  const localDateTime = new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    now.getHours(),
    now.getMinutes(),
    now.getSeconds(),
    now.getMilliseconds(),
  )

  return localDateTime.toISOString()
}
