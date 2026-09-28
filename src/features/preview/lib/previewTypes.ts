import {
  CalendarClock,
  ClipboardList,
  DollarSign,
  LayoutGrid,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react"

export const PREVIEW_TYPE_IDS = [
  "beo",
  "beo-food",
  "timeline",
  "financial-report",
  "cart-diagram",
] as const

export type PreviewTypeId = (typeof PREVIEW_TYPE_IDS)[number]

export const DEFAULT_PREVIEW_TYPE: PreviewTypeId = "beo"

export type PreviewTypeDefinition = {
  id: PreviewTypeId
  label: string
  icon: LucideIcon
}

export const PREVIEW_TYPES: PreviewTypeDefinition[] = [
  {
    id: "beo",
    label: "Full BEO",
    icon: ClipboardList,
  },
  {
    id: "beo-food",
    label: "Food BEO",
    icon: UtensilsCrossed,
  },
  {
    id: "timeline",
    label: "Timeline",
    icon: CalendarClock,
  },
  {
    id: "financial-report",
    label: "Financial Report",
    icon: DollarSign,
  },
  {
    id: "cart-diagram",
    label: "Cart Setup Diagram",
    icon: LayoutGrid,
  },
]

const PREVIEW_TYPE_SET = new Set<string>(PREVIEW_TYPE_IDS)

export function isPreviewTypeId(value: string): value is PreviewTypeId {
  return PREVIEW_TYPE_SET.has(value)
}

export function resolvePreviewType(searchParams: URLSearchParams): PreviewTypeId {
  const rawType = searchParams.get("type")?.trim()
  if (!rawType || !isPreviewTypeId(rawType)) {
    return DEFAULT_PREVIEW_TYPE
  }

  return rawType
}

export function getPreviewTypeLabel(type: PreviewTypeId): string {
  return PREVIEW_TYPES.find((entry) => entry.id === type)?.label ?? type
}

export function getPreviewTypesForEvent(
  eventType: string | null | undefined,
): PreviewTypeDefinition[] {
  return PREVIEW_TYPES.filter(
    ({ id }) => id !== "cart-diagram" || eventType === "tournament",
  )
}

export function buildPreviewPath(eventId: string, type: PreviewTypeId = DEFAULT_PREVIEW_TYPE): string {
  return `/preview/${eventId}?type=${type}`
}
