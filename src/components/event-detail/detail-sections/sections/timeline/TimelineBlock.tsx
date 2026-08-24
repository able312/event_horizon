import React from 'react';
import { Clock } from "lucide-react"
import type { TimelineTimeblock } from '~/definitions/timeblocks/timeblocks-types';
import type { Timeblock, BeverageItem } from '~/definitions/database';
import { v4 as uuidv4 } from 'uuid'
import { SECTION_TYPE } from '~/definitions/timeblocks/timeblock-constants';
import {
  formatBeverageItemLine,
  getVisibleBeverageTypeSections,
} from '~/features/event-detail/sections/food-beverage-workspaces/beverage/beverageTypeSections';

interface TimelineBlocksProps {
  timeblock: TimelineTimeblock,
  updateTimeblock: (data: { id: string; updates: Partial<Timeblock> }) => void,
}

const TimelineBlock: React.FC<TimelineBlocksProps> = ({ timeblock, updateTimeblock }) => {

  if (!timeblock.time || timeblock.time.length === 0) return null

  return (
    <GenericTimeblock
      timeblock={timeblock}
      updateTimeblock={updateTimeblock}
    >

      {timeblock.sectionType === SECTION_TYPE.FOOD &&
        timeblock.foodItems?.map(item => (
          <GenericDetailsBlock
            key={"foodItem_" + item.id}
            blockHeader={ (item.quantity ? item.quantity + " x " : "") + item.name }
            blockSubtitle={ item.serviceStyle }
            blockNotes={ item.includes }
            borderColor='amber'
          />
        ))
      }

      {timeblock.sectionType === SECTION_TYPE.BEVERAGE && (
        <>
          {timeblock.details ? (
            <GenericDetailsBlock
              key={`beverage_notes_${timeblock.id}`}
              blockNotes={timeblock.details}
              borderColor='blue'
            />
          ) : null}
          {getVisibleBeverageTypeSections(timeblock.beverageItems ?? [], { hideEmptySpecialOrders: true })
            .filter(section => section.items.length > 0)
            .map((section) => (
              <div key={`${timeblock.id}_${section.type}`} className="break-inside-avoid">
                <GenericDetailsBlock
                  blockHeader={section.type}
                  borderColor='blue'
                  blockNotes={section.items.map(i => i.name).join('\n')}
                />
              </div>
            ))}
        </>
      )}

      {timeblock.sectionType === SECTION_TYPE.VENDOR &&
        <GenericDetailsBlock
          blockHeader={ timeblock.vendorItem?.contactName }
          blockSubtitle={ timeblock.vendorItem?.contactPhone + " | " + timeblock.vendorItem?.contactEmail  }
          blockNotes={ timeblock.details }
          borderColor='purple'
        />
      }

      {timeblock.sectionType === SECTION_TYPE.SETUP_INSTRUCTION &&
         timeblock.details?.split("\n\n").map(part => (
           <GenericDetailsBlock
             key={"setupInstructionPart_" + uuidv4()}
             {...parseBlock(part)}
             borderColor='red'
           />
         ))
      }

      {timeblock.sectionType === SECTION_TYPE.NOTE &&
         timeblock.details?.split("\n\n").map(part => (
           <GenericDetailsBlock
             key={"notePart_" + uuidv4()}
             {...parseBlock(part)}
             borderColor='gray'
           />
         ))
      }

      {timeblock.sectionType === SECTION_TYPE.TOURNAMENT_DETAIL &&
         timeblock.details?.split("\n\n").map(part => (
           <GenericDetailsBlock
             key={"notePart_" + uuidv4()}
             {...parseBlock(part)}
             borderColor='green'
           />
         ))
      }

      {timeblock.sectionType === SECTION_TYPE.CART_DETAIL &&
        <div className="break-inside-avoid">
          <GenericDetailsBlock
            blockHeader={ "Goes on Cart" }
            blockNotes={ timeblock.cartDetails?.whatGoesOnCarts }
            borderColor='green'
          />
          <CartGridBlock
            grid={ timeblock.cartDetails?.customGrid }
            borderColor="green"
          />
        </div>
      }


    </GenericTimeblock>
  );
};

export default TimelineBlock;

type GenericTimeblockProps = {
  timeblock: TimelineTimeblock,
  updateTimeblock: (data: { id: string; updates: Partial<Timeblock> }) => void,
  children: React.ReactNode,
}
const GenericTimeblock: React.FC<GenericTimeblockProps> = ({ timeblock, updateTimeblock, children }) => {
  const isEditable = timeblock.timelineMeta?.isEditable ?? true

  return (
    <div
      className={`flex items-start gap-3 p-3 hover:bg-stone-100 transition-colors border-b-2 border-solid ${timeblock.sectionType === "cart_detail" ? "break-inside-avoid" : ""}`}
    >
      {/* Time */}
      <div className="flex items-center gap-2 min-w-[80px]">
        <Clock size={14} className="text-stone-400" />
        <input
          type="time"
          defaultValue={timeblock.time as string}
          disabled={!isEditable}
          onBlur={(e) => {
            if (!isEditable) return
            updateTimeblock({ id: timeblock.id, updates: { time: e.target.value } })
          }}
          className="border-none bg-transparent text-sm font-mono text-stone-600 outline-none"
        />
      </div>

      <div className="flex-1">
        {/* Block Header */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-stone-800">
              {timeblock.title || "Untitled"}
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${getTypeColor(timeblock.sectionType)}`}>
              {getTypeLabel(timeblock.sectionType)}
            </span>
          </div>
          {timeblock.assignedTo && <div className='text-xs font-sans italic p-2'>{timeblock.assignedTo}</div>}


        {/* Block Deatils */}
        <div className='grid grid-cols-1 items-start  gap-0'>
            { children }
        </div>
      </div>
    </div>
  )
}

type GenericDetailsBlockProps = {
  blockHeader?: React.ReactNode
  blockSubtitle?: React.ReactNode
  blockNotes?: React.ReactNode
  borderColor?: string
}
const GenericDetailsBlock: React.FC<GenericDetailsBlockProps> = ({ blockHeader, blockSubtitle, blockNotes, borderColor }) => {
  if (!blockHeader && !blockSubtitle && !blockNotes) return null
  return (
    <div className={`mt-2 pl-2 border-l-2 border-${borderColor}-200 break-inside-avoid`}>
      <div className="pb-2">
          {blockHeader && <div className='text-xs text-stone-600 font-bold pb-1'>{blockHeader}</div>}
          {blockSubtitle && <div className='text-xs font-sans text-stone-600 pb-1'>{ blockSubtitle }</div>}
          {blockNotes && <pre className='text-xs font-sans italic text-stone-600 text-wrap pb-1'>{ blockNotes }</pre>}
        </div>
    </div>
  )
}

type CartGridBlockProps = {
  grid: (string | number | null)[][] | null | undefined
  borderColor?: string
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
    ["Lead", null, "Lead", null, "Lead", null]
  ],
  borderColor
}) => {

  const cartCount = grid?.flat().filter(cell => cell !== null).length ?? 0

  return (
    <>
      <div className={`mt-2 pl-2 border-l-2 border-${borderColor}-200 break-inside-avoid`}>

        <div className="grid grid-cols-[10%_20%_10%_20%_10%_10%] gap-2">
            {grid?.map((row, ri) => (
              <>
                {row.map((cell, ci) => (
                  <div key={`cart_cell_${ri}_${ci}`} className={`w-8 h-12 ${cell ? "border-1 flex items-center justify-center" : ""} ${ci === 2 || ci === 4 ? "mr-6" : "mr-2"}`}>
                    { cell ? cell === "Lead" ? "L" : cell : "" }
                  </div>
                ))}
              </>
            ))}
          </div>
           <p className='text-sm pt-4 text-stone-500'>Requires {cartCount} carts.</p>
      </div>

      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 mt-6 break-inside-avoid">
        <p className="text-xs font-semibold text-yellow-800">
          ⚠️ DO NOT leave keys in carts or hand out keys before tournament start time
        </p>
      </div>
    </>
  )
}

// helpers
const parseBlock = (str: string) => {
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


const getTypeColor = (type: string) => {
    switch (type) {
      case 'food': return 'bg-amber-100 text-amber-800'
      case 'beverage': return 'bg-blue-100 text-blue-800'
      case 'vendor': return 'bg-purple-100 text-purple-800'
      case 'setup_instruction': return 'bg-red-100 text-red-800'
      case 'note': return 'bg-stone-100 text-stone-800'
      case 'tournament_detail': return 'bg-green-100 text-green-800'
      case 'cart_detail': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'food': return 'Food'
      case 'beverage': return 'Beverage'
      case 'vendor': return 'Vendor'
      case 'note': return 'Note'
      case 'setup_instruction': return 'Setup Instruction'
      case 'tournament_detail': return 'Tournament Detail'
      case 'cart_detail': return 'Tournament Detail'

      default: return type
    }
  }
