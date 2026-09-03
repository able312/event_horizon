import React from "react"
import type { TimelineTimeblock } from "~/definitions/timeblocks/timeblocks-types"
import { SECTION_TYPE } from "~/definitions/timeblocks/timeblock-constants"
import {
  getVisibleBeverageTypeSections,
} from "~/features/event-detail/sections/food-beverage-workspaces/beverage/beverageTypeSections"
import { CartPreview } from "~/features/preview/components/CartPreview"
import { PreviewMarkdownContent } from "~/lib/markdown/PreviewMarkdownContent"

type TimelineBlockProps = {
  timeblock: TimelineTimeblock
}

const TimelineBlock: React.FC<TimelineBlockProps> = ({ timeblock }) => {
  if (!timeblock.time || timeblock.time.length === 0) return null

  return (
    <GenericTimeblock timeblock={timeblock}>
      {timeblock.sectionType === SECTION_TYPE.FOOD && (
        <>
          {timeblock.details ? (
            <GenericDetailsBlock
              key={`food_notes_${timeblock.id}`}
              markdownNotes={timeblock.details}
              borderColor="amber"
            />
          ) : null}
          {timeblock.foodItems?.map((item) => (
            <GenericDetailsBlock
              key={"foodItem_" + item.id}
              blockHeader={(item.quantity ? item.quantity + " x " : "") + item.name}
              blockSubtitle={item.serviceStyle}
              plainNotes={item.includes}
              borderColor="amber"
            />
          ))}
        </>
      )}

      {timeblock.sectionType === SECTION_TYPE.BEVERAGE && (
        <>
          {timeblock.details ? (
            <GenericDetailsBlock
              key={`beverage_notes_${timeblock.id}`}
              markdownNotes={timeblock.details}
              borderColor="blue"
            />
          ) : null}
          {getVisibleBeverageTypeSections(timeblock.beverageItems ?? [], { hideEmptySpecialOrders: true })
            .filter((section) => section.items.length > 0)
            .map((section) => (
              <div key={`${timeblock.id}_${section.type}`} className="break-inside-avoid">
                <GenericDetailsBlock
                  blockHeader={section.type}
                  borderColor="blue"
                  plainNotes={section.items.map((i) => i.name).join("\n")}
                />
              </div>
            ))}
        </>
      )}

      {timeblock.sectionType === SECTION_TYPE.VENDOR && (
        <GenericDetailsBlock
          blockHeader={timeblock.vendorItem?.contactName}
          blockSubtitle={
            timeblock.vendorItem?.contactPhone + " | " + timeblock.vendorItem?.contactEmail
          }
          markdownNotes={timeblock.details}
          borderColor="purple"
        />
      )}

      {timeblock.sectionType === SECTION_TYPE.SETUP_INSTRUCTION && timeblock.details ? (
        <GenericDetailsBlock
          key={`${timeblock.id}_setup`}
          markdownNotes={timeblock.details}
          borderColor="red"
        />
      ) : null}

      {timeblock.sectionType === SECTION_TYPE.NOTE && timeblock.details ? (
        <GenericDetailsBlock
          key={`${timeblock.id}_note`}
          markdownNotes={timeblock.details}
          borderColor="gray"
        />
      ) : null}

      {timeblock.sectionType === SECTION_TYPE.TOURNAMENT_DETAIL && timeblock.details ? (
        <GenericDetailsBlock
          key={`${timeblock.id}_tournament`}
          markdownNotes={timeblock.details}
          borderColor="green"
        />
      ) : null}

      {timeblock.sectionType === SECTION_TYPE.CART_DETAIL && (
        <div className="mt-2">
          <CartPreview
            whatGoesOnCarts={timeblock.cartDetails?.whatGoesOnCarts}
            customGrid={timeblock.cartDetails?.customGrid}
            showSetupMetadata={false}
          />
        </div>
      )}
    </GenericTimeblock>
  )
}

export default TimelineBlock

type GenericTimeblockProps = {
  timeblock: TimelineTimeblock
  children: React.ReactNode
}

const GenericTimeblock: React.FC<GenericTimeblockProps> = ({ timeblock, children }) => {
  return (
    <div className="flex items-start gap-3 border-b-2 border-solid p-3">
      <div className="flex min-w-[80px] items-center gap-2">
        <span className="font-mono text-sm text-stone-600">{timeblock.time}</span>
      </div>

      <div className="flex-1">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-sm font-medium text-stone-800">
            {timeblock.title || "Untitled"}
          </span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] ${getTypeColor(timeblock.sectionType)}`}>
            {getTypeLabel(timeblock.sectionType)}
          </span>
        </div>
        {timeblock.assignedTo ? (
          <div className="p-2 font-sans text-xs italic">{timeblock.assignedTo}</div>
        ) : null}

        <div className="grid grid-cols-1 items-start gap-0">{children}</div>
      </div>
    </div>
  )
}

type BorderColor = "amber" | "blue" | "purple" | "red" | "gray" | "green"

const BORDER_COLOR_CLASS: Record<BorderColor, string> = {
  amber: "border-amber-200",
  blue: "border-blue-200",
  purple: "border-purple-200",
  red: "border-red-200",
  gray: "border-gray-200",
  green: "border-green-200",
}

type GenericDetailsBlockProps = {
  blockHeader?: React.ReactNode
  blockSubtitle?: React.ReactNode
  markdownNotes?: string | null
  plainNotes?: string | null
  borderColor?: BorderColor
}

const GenericDetailsBlock: React.FC<GenericDetailsBlockProps> = ({
  blockHeader,
  blockSubtitle,
  markdownNotes,
  plainNotes,
  borderColor = "gray",
}) => {
  const hasMarkdown = Boolean(markdownNotes)
  const hasPlain = Boolean(plainNotes)
  if (!blockHeader && !blockSubtitle && !hasMarkdown && !hasPlain) return null

  return (
    <div className={`mt-2 break-inside-avoid border-l-2 pl-2 ${BORDER_COLOR_CLASS[borderColor]}`}>
      <div className="pb-2">
        {blockHeader ? <div className="pb-1 text-xs font-bold text-stone-600">{blockHeader}</div> : null}
        {blockSubtitle ? <div className="pb-1 font-sans text-xs text-stone-600">{blockSubtitle}</div> : null}
        {hasMarkdown && markdownNotes ? (
          <div className="pb-1 font-sans text-xs text-stone-600">
            <PreviewMarkdownContent source={markdownNotes} />
          </div>
        ) : null}
        {hasPlain && plainNotes ? (
          <pre className="pb-1 font-sans text-xs italic text-wrap text-stone-600">{plainNotes}</pre>
        ) : null}
      </div>
    </div>
  )
}

function getTypeColor(type: string) {
  switch (type) {
    case "food":
      return "bg-amber-100 text-amber-800"
    case "beverage":
      return "bg-blue-100 text-blue-800"
    case "vendor":
      return "bg-purple-100 text-purple-800"
    case "setup_instruction":
      return "bg-red-100 text-red-800"
    case "note":
      return "bg-stone-100 text-stone-800"
    case "tournament_detail":
      return "bg-green-100 text-green-800"
    case "cart_detail":
      return "bg-green-100 text-green-800"
    default:
      return "bg-gray-100 text-gray-800"
  }
}

function getTypeLabel(type: string) {
  switch (type) {
    case "food":
      return "Food"
    case "beverage":
      return "Beverage"
    case "vendor":
      return "Vendor"
    case "note":
      return "Note"
    case "setup_instruction":
      return "Setup Instruction"
    case "tournament_detail":
      return "Tournament Detail"
    case "cart_detail":
      return "Cart Details"
    default:
      return type
  }
}
