import { useSetupInstructionSection } from "~/hooks/useSetupInstrucionSection"

export const SetupInstructionDetails = () => {
    
    const { data: instructionTimeblocks } = useSetupInstructionSection()

    const sortedTimeblocks = instructionTimeblocks?.sort((a, b) => {
        const timeA = a.time ?? ""
        const timeB = b.time ?? ""
        return timeA.localeCompare(timeB)
    })

    return (
        <>
        { sortedTimeblocks?.map(timeblock => (
            <div key={ timeblock.id }>
                <h3 className="pb-1 font-bold text-sm">{timeblock.title}</h3>
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                    <dt className="text-muted-foreground">Setup Time</dt>
                    <dd className="font-medium">{timeblock?.time}</dd>
                </dl>

                {timeblock.details && (
                    <div className="mt-3 pt-3 border-t text-sm">
                        <p className="text-muted-foreground mb-1">Instructions</p>
                        <pre className="font-sans whitespace-pre-wrap">{timeblock.details}</pre>
                    </div>
                )}
            </div>
        ))}
        </>
    )
}
