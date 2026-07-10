import { useState } from "react"

interface InternalNotesCardProps {
    savedValue: string,
    onUpdate: (value: string) => void
}

export const InternalNotesCard: React.FC<InternalNotesCardProps> = ({savedValue, onUpdate}) => {

    const [noteValue, setNoteValue] = useState(savedValue)

    const handleUpdate = (value: string) => {
        if (value === savedValue) return
        onUpdate(value)
    }

    return (
        <section className="rounded-xs border border-border bg-background p-3 shadow-sm">
            <div className="border-b border-border pb-2">
                <h3 className="text-sm font-semibold tracking-wide">Internal Notes</h3>
                <p className="text-xs text-muted-foreground">
                    Internal notes primarily used for the leadership team.
                </p>
            </div>
            <textarea
                rows={5}
                value={noteValue}
                onChange={(e) => setNoteValue(e.target.value)}
                placeholder="Add your internal notes for the leadership team here..."
                onBlur={(e) => handleUpdate(e.target.value)}
                aria-label="Intertnal Notes"
                className="mt-2 w-full resize-none rounded-xs border border-transparent bg-transparent px-1.5 py-1 text-sm leading-relaxed outline-none transition-colors focus:border-border focus:bg-background"
            />
        </section>
    )
}