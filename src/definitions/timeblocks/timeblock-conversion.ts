import type { TimeblockType } from "./timeblocks-types.js"
import { SECTION_TYPE } from "./timeblock-constants.js"

/**
 * Destinations supported by the conversion UI in this iteration.
 * Extend as more types become convertible.
 */
export const CONVERTIBLE_TIMEBLOCK_TYPES = [
  SECTION_TYPE.NOTE,
  SECTION_TYPE.SETUP_INSTRUCTION,
  SECTION_TYPE.FOOD,
  SECTION_TYPE.BEVERAGE,
] as const satisfies readonly TimeblockType[]

export type ConvertibleTimeblockType = (typeof CONVERTIBLE_TIMEBLOCK_TYPES)[number]

export type ConversionLossField =
  | "food_items"
  | "quantities"
  | "prices"
  | "service_styles"
  | "item_notes"
  | "beverage_assignments"

export type ConversionImpact = {
  fromType: TimeblockType
  toType: TimeblockType
  timeblockId: string
  timeblockTitle: string
  isDestructive: boolean
  requiresConfirmation: boolean
  deletedItemCount: number
  removedAssignmentCount: number
  lostFields: ConversionLossField[]
  summary: string
}

export type InspectConversionInput = {
  timeblockId: string
  toType: TimeblockType
}

export type ConvertTimeblockInput = {
  timeblockId: string
  toType: TimeblockType
  /** Required when the conversion deletes specialized satellite data. */
  confirmDestructive?: boolean
}

export type ConvertTimeblockResult = {
  timeblock: import("../database.js").Timeblock
  impact: ConversionImpact
}

const CONVERTIBLE_SET = new Set<string>(CONVERTIBLE_TIMEBLOCK_TYPES)

export function isConvertibleTimeblockType(value: string): value is ConvertibleTimeblockType {
  return CONVERTIBLE_SET.has(value)
}

export function assertConvertibleTimeblockType(value: string): ConvertibleTimeblockType {
  if (!isConvertibleTimeblockType(value)) {
    throw new Error(`Unsupported conversion destination: ${value}`)
  }
  return value
}

/**
 * Data-driven cleanup/impact rules keyed by leaving a specialized source type.
 * Add entries here as more specialized types become convertible.
 */
type SourceCleanupContext = {
  foodItemCount: number
  beverageAssignmentCount: number
}

type SourceCleanupRule = {
  countDeletedItems: (ctx: SourceCleanupContext) => number
  countRemovedAssignments: (ctx: SourceCleanupContext) => number
  lostFields: (ctx: SourceCleanupContext) => ConversionLossField[]
  buildSummary: (params: {
    title: string
    deletedItemCount: number
    removedAssignmentCount: number
    toType: TimeblockType
  }) => string
}

const SOURCE_CLEANUP_RULES: Partial<Record<TimeblockType, SourceCleanupRule>> = {
  food: {
    countDeletedItems: ({ foodItemCount }) => foodItemCount,
    countRemovedAssignments: () => 0,
    lostFields: ({ foodItemCount }) =>
      foodItemCount > 0
        ? ["food_items", "quantities", "prices", "service_styles", "item_notes"]
        : [],
    buildSummary: ({ title, deletedItemCount, toType }) => {
      const destinationLabel = getConversionTypeLabel(toType)
      const displayTitle = title.trim() || "Untitled"
      return `Converting ${displayTitle} to a ${destinationLabel} will permanently delete ${deletedItemCount} food item${deletedItemCount === 1 ? "" : "s"}, including quantities, prices, service styles, and item notes.`
    },
  },
  beverage: {
    countDeletedItems: () => 0,
    countRemovedAssignments: ({ beverageAssignmentCount }) => beverageAssignmentCount,
    lostFields: ({ beverageAssignmentCount }) =>
      beverageAssignmentCount > 0 ? ["beverage_assignments"] : [],
    buildSummary: ({ title, removedAssignmentCount, toType }) => {
      const destinationLabel = getConversionTypeLabel(toType)
      const displayTitle = title.trim() || "Untitled"
      return `Converting ${displayTitle} to a ${destinationLabel} will remove ${removedAssignmentCount} beverage assignment${removedAssignmentCount === 1 ? "" : "s"} from this timeblock. The beverage menu items will remain available elsewhere in this event.`
    },
  },
}

export function getConversionTypeLabel(sectionType: TimeblockType): string {
  switch (sectionType) {
    case SECTION_TYPE.FOOD:
      return "Food"
    case SECTION_TYPE.SETUP_INSTRUCTION:
      return "Setup Instruction"
    case SECTION_TYPE.NOTE:
      return "Note"
    case SECTION_TYPE.BEVERAGE:
      return "Beverage"
    case SECTION_TYPE.VENDOR:
      return "Logistics"
    default:
      return sectionType
  }
}

export function buildConversionImpact(params: {
  timeblockId: string
  title: string
  fromType: TimeblockType
  toType: TimeblockType
  foodItemCount: number
  beverageAssignmentCount?: number
}): ConversionImpact {
  const {
    timeblockId,
    title,
    fromType,
    toType,
    foodItemCount,
    beverageAssignmentCount = 0,
  } = params

  if (fromType === toType) {
    throw new Error(`Timeblock is already type ${toType}`)
  }

  assertConvertibleTimeblockType(fromType)
  assertConvertibleTimeblockType(toType)

  const ctx: SourceCleanupContext = { foodItemCount, beverageAssignmentCount }
  const rule = SOURCE_CLEANUP_RULES[fromType]
  const deletedItemCount = rule?.countDeletedItems(ctx) ?? 0
  const removedAssignmentCount = rule?.countRemovedAssignments(ctx) ?? 0
  const lostFields = rule?.lostFields(ctx) ?? []
  const isDestructive = deletedItemCount > 0 || removedAssignmentCount > 0 || lostFields.length > 0

  return {
    fromType,
    toType,
    timeblockId,
    timeblockTitle: title,
    isDestructive,
    requiresConfirmation: isDestructive,
    deletedItemCount,
    removedAssignmentCount,
    lostFields,
    summary: isDestructive && rule
      ? rule.buildSummary({ title, deletedItemCount, removedAssignmentCount, toType })
      : `Convert ${title.trim() || "Untitled"} to ${getConversionTypeLabel(toType)}.`,
  }
}

export function getDestinationOptions(currentType: TimeblockType): ConvertibleTimeblockType[] {
  return CONVERTIBLE_TIMEBLOCK_TYPES.filter((type) => type !== currentType)
}
