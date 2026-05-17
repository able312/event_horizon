import { useNoteSection } from "~/hooks/useNoteSection"

export const NoteDetails = () => {
    
    const { data: noteTimeblocks } = useNoteSection()

    const sortedTimeblocks = noteTimeblocks?.sort((a, b) => {
        const timeA = a.time ?? ""
        const timeB = b.time ?? ""
        return timeA.localeCompare(timeB)
    })

    return (
        <>
        { sortedTimeblocks?.map(timeblock => (
            <div key={ timeblock.id }>
                <h3 className="pb-1 font-bold text-sm">{timeblock.title}</h3>
                {timeblock.time && <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                    <dt className="text-muted-foreground">Time</dt>
                    <dd className="font-medium">{timeblock?.time}</dd>
                    <dt className="text-muted-foreground">Assigned to</dt>
                    <dd className="font-medium">{timeblock?.assignedTo}</dd>
                </dl>}

                {timeblock?.note?.content && (
                    <div className="mt-3 pt-3 border-t text-sm">
                        <pre className="font-sans whitespace-pre-wrap">{timeblock.note.content}</pre>
                    </div>
                )}
            </div>
        ))}
        </>
    )
}