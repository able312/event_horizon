import { useMemo, useRef, useState } from "react"
import { CornerDownRight } from "lucide-react"
import type { WorkspaceItemBase } from "./PlanningWorkspaceTimeblockList"
import { Button } from "~/components/ui/button"


interface PlanningTimeblockItemNoteRowProps <TItem extends WorkspaceItemBase> {
    note: string,
    timeblockID: string,
    itemID: string,
    updateItem: (payload: { timeblockId: string, itemId: string, updates: Partial<TItem> }) => void
}

export function PlanningTimeblockItemNoteRow<TItem extends WorkspaceItemBase> ({
    note,
    timeblockID,
    itemID,
    updateItem
}: PlanningTimeblockItemNoteRowProps<TItem>) {

    const [isEditing, setIsEditing] = useState<boolean>(false)
    const shortNote = useMemo(() => {
        const trimNote = note.replaceAll("\n\n", " | ")
        return trimNote.replaceAll("\n", ", ")
    }, [note])

    const inputRef = useRef<HTMLTextAreaElement>(null)

    const handleSwitchLength = () => {
        setIsEditing((prev) => !prev)
    }

    const handleStartEdit = () => {
        setIsEditing(true)
        // focus the textarea once it has been rendered and move the cursor to the end
        setTimeout(() => {
            const textarea = inputRef.current
            if (textarea) {
                textarea.focus()
                const length = textarea.value.length
                textarea.setSelectionRange(length, length)
            }
        }, 10)
    }

    const patchItem = (field: keyof WorkspaceItemBase, value: WorkspaceItemBase[keyof WorkspaceItemBase]) =>
    ({ [field]: value }) as Partial<TItem>

    console.log(inputRef)
    
    return (
        <div className={`flex items-start`}>
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
                        updateItem({ timeblockId: timeblockID, itemId: itemID, updates: patchItem("includes", e.target.value) })
                    }}
                    ref={ inputRef }
                    aria-label="Includes / Notes"
                    placeholder="Notes..."
                    rows={note.split("\n").length + 1}
                    className="min-h-8 w-full rounded-xs border border-transparent bg-transparent px-1.5 py-1 text-sm text-stone-500 outline-none transition-colors focus:border-border focus:bg-background focus:text-foreground"
                />
                :
                <div className={`${shortNote.length <= 0 ? "text-stone-400" : "text-stone-500"} px-2 py-1 w-full`} onClick={ handleStartEdit }>{ shortNote.length <= 0 ? "Notes..." : shortNote }</div>
            }
        </div>
    )
}