import React from "react"
import { Clock } from "lucide-react"
import type { TimelineTimeblock } from "~/definitions/timeblocks/timeblocks-types"
import { SECTION_TYPE } from "~/definitions/timeblocks/timeblock-constants"
import {
  getVisibleBeverageTypeSections,
} from "~/features/event-detail/sections/food-beverage-workspaces/beverage/beverageTypeSections"
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
        <div className="break-inside-avoid">
          <GenericDetailsBlock
            blockHeader="Goes on Cart"
            markdownNotes={timeblock.cartDetails?.whatGoesOnCarts}
            borderColor="green"
          />
          <CartGridBlock
            grid={timeblock.cartDetails?.customGrid}
            borderColor="green"
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
    <div
      className={`flex items-start gap-3 p-3 border-b-2 border-solid ${timeblock.sectionType === "cart_detail" ? "break-inside-avoid" : ""}`}
    >
      <div className="flex items-center gap-2 min-w-[80px]">
        <Clock size={14} className="text-stone-400" />
        <span className="text-sm font-mono text-stone-600">{timeblock.time}</span>
      </div>

      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-stone-800">
            {timeblock.title || "Untitled"}
          </span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full ${getTypeColor(timeblock.sectionType)}`}>
            {getTypeLabel(timeblock.sectionType)}
          </span>
        </div>
        {timeblock.assignedTo && (
          <div className="text-xs font-sans italic p-2">{timeblock.assignedTo}</div>
        )}

        <div className="grid grid-cols-1 items-start gap-0">
          {children}
        </div>
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
    <div className={`mt-2 pl-2 border-l-2 ${BORDER_COLOR_CLASS[borderColor]} break-inside-avoid`}>
      <div className="pb-2">
        {blockHeader && <div className="text-xs text-stone-600 font-bold pb-1">{blockHeader}</div>}
        {blockSubtitle && <div className="text-xs font-sans text-stone-600 pb-1">{blockSubtitle}</div>}
        {hasMarkdown && markdownNotes ? (
          <div className="text-xs font-sans text-stone-600 pb-1">
            <PreviewMarkdownContent source={markdownNotes} />
          </div>
        ) : null}
        {hasPlain && plainNotes ? (
          <pre className="text-xs font-sans italic text-stone-600 text-wrap pb-1">{plainNotes}</pre>
        ) : null}
      </div>
    </div>
  )
}

type CartGridBlockProps = {
  grid: (string | number | null)[][] | null | undefined
  borderColor?: BorderColor
}

const CartGridBlock: React.FC<CartGridBlockProps> = ({
  grid = [
    [7, 5, 9, 10, 3, 1],
    [7, 5, 9, 10, 3, 1],
    [7, 5, 9, 10, 3, 1],
    [7, 5, 9, 10, 3, 1],
    [8, 6, 12, 11, 4, 2],
    [8, 6, 12, 11, 4, 2],
    [8, 6, 12, 11, 4, 2],
    [8, 6, 12, 11, 4, 2],
    ["Lead", null, "Lead", null, "Lead", null],
  ],
  borderColor = "green",
}) => {
  const cartCount = grid?.flat().filter((cell) => cell !== null).length ?? 0

  return (
    <>
      <div className={`mt-2 pl-2 border-l-2 ${BORDER_COLOR_CLASS[borderColor]} break-inside-avoid`}>
        <div className="grid grid-cols-[10%_20%_10%_20%_10%_10%] gap-2">
          {grid?.map((row, ri) => (
            <React.Fragment key={`cart_row_${ri}`}>
              {row.map((cell, ci) => (
                <div
                  key={`cart_cell_${ri}_${ci}`}
                  className={`w-8 h-12 ${cell ? "border-1 flex items-center justify-center" : ""} ${ci === 2 || ci === 4 ? "mr-6" : "mr-2"}`}
                >
                  {cell ? (cell === "Lead" ? "L" : cell) : ""}
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>
        <p className="text-sm pt-4 text-stone-500">Requires {cartCount} carts.</p>
      </div>

      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 mt-6 break-inside-avoid">
        <p className="text-xs font-semibold text-yellow-800">
          ⚠️ DO NOT leave keys in carts or hand out keys before tournament start time
        </p>
      </div>
    </>
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
      return "Tournament Detail"
    default:
      return type
  }
}
