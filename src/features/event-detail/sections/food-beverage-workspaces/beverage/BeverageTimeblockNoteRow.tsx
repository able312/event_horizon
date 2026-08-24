import { useMemo, useRef, useState } from "react"
import { CornerDownRight } from "lucide-react"

import type { UpdateTimeblock } from "~/definitions/database"
import { Button } from "~/components/atoms/button"

interface BeverageTimeblockNoteRowProps {
  note: string
  timeblockId: string
  updateTimeblock: (payload: { id: string; updates: UpdateTimeblock }) => void
}

export function BeverageTimeblockNoteRow({
  note,
  timeblockId,
  updateTimeblock,
}: BeverageTimeblockNoteRowProps) {
  const [isEditing, setIsEditing] = useState(false)
  const shortNote = useMemo(() => {
    const trimNote = note.split("\n\n").join(" | ")
    return trimNote.split("\n").join(", ")
  }, [note])

  const inputRef = useRef<HTMLTextAreaElement>(null)

  const handleSwitchLength = () => {
    setIsEditing((prev) => !prev)
  }

  const handleStartEdit = () => {
    setIsEditing(true)
    setTimeout(() => {
      const textarea = inputRef.current
      if (textarea) {
        textarea.focus()
        const length = textarea.value.length
        textarea.setSelectionRange(length, length)
      }
    }, 10)
  }

  return (
    <div className={`flex items-start py-1`}>
            <Button
                variant="ghost"
                className="size-6 text-stone-400 hover:text-orange-500"
                onClick={handleSwitchLength}
            >
                <CornerDownRight size={ 4 } />
            </Button>

            {isEditing ?
                <textarea
                    defaultValue={ note }
                    onBlur={(e) => {
                        updateTimeblock({ id: timeblockId, updates: { details: e.target.value } })

                    }}
                    ref={ inputRef }
                    aria-label="Includes / Notes"
                    placeholder="Notes..."
                    className="min-h-8 w-full rounded-xs border border-transparent bg-transparent px-1.5 py-1 text-sm text-stone-500 outline-none transition-colors focus:border-border focus:bg-background focus:text-foreground field-sizing-content"
                />
                :
                <div className={`${shortNote.length <= 0 ? "text-stone-400" : "text-stone-500"} text-sm m-0.25 px-1.5 py-1 min-h-7.5 w-full`} onClick={ handleStartEdit }>{ shortNote.length <= 0 ? "Notes..." : shortNote }</div>
            }
        </div>
  )
}
