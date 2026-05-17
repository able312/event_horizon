import { useBeverageSection } from "~/hooks/useBeverageSection"

export const BeverageDetails = () => {
    
    const { data: beverageTimeblocks } = useBeverageSection()

    const sortedTimeblocks = beverageTimeblocks?.sort((a, b) => {
        const timeA = a.time ?? ""
        const timeB = b.time ?? ""
        return timeA.localeCompare(timeB)
    })
    
    return (
        <>
        {sortedTimeblocks?.map(timeblock => (
            <div key={timeblock.id} className="">
                <h3 className="pb-1 font-bold text-sm">{timeblock.title}</h3>
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm border-b-1 pb-2">
                    <dt className="text-muted-foreground">Time</dt>
                    <dd className="font-medium">{timeblock.time}</dd>

                    <dt className="text-muted-foreground">Assigned to</dt>
                    <dd className="font-medium">{timeblock.assignedTo}</dd>
                </dl>
                <div className="grid grid-cols-2 gap-2">
                {timeblock?.beverageItems?.map(beverage => (
                    <div className="border-1 mt-3 px-2 py-1" key={beverage.id}>
                        <h3 className="pb-1 font-bold text-sm">{beverage.name}</h3>
                        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                            
                            {beverage.serviceStyle && (<>
                                <dt className="text-muted-foreground">Service Style</dt>
                                <dd className="font-medium">{ beverage.serviceStyle }</dd>
                            </>)}
                            
                            

                            {beverage.quantity && (<>
                                <dt className="text-muted-foreground">Qty</dt>
                                <dd className="font-medium">{ beverage.quantity }</dd>
                            </>)}

                        </dl>
                        {beverage?.includes && (
                            <div className="mt-3 pt-3 border-t text-sm">
                                <p className="text-muted-foreground mb-1">Notes</p>
                                <pre className="font-sans whitespace-pre-wrap">{beverage.includes}</pre>
                            </div>
                        )}
                    </div>
                ))}
                </div>
            </div>
        ))}
        </>
    )
}