import { useFoodSection } from "~/hooks/useFoodSection"

export const FoodDetails = () => {
    
    const { data: foodTimeblocks } = useFoodSection()

    const sortedTimeblocks = foodTimeblocks?.slice().sort((a, b) => {
        const timeA = a.time ?? ""
        const timeB = b.time ?? ""
        return timeA.localeCompare(timeB)
    })
    
    return (
        <>
        {sortedTimeblocks?.map(timeblock => (
            <div key={timeblock.id}>
                <h3 className="font-bold text-sm">{timeblock.title}</h3>
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm pb-2">
                    <dt className="text-muted-foreground">Time</dt>
                    <dd className="font-medium">{timeblock.time}</dd>

                    <dt className="text-muted-foreground">Assigned to</dt>
                    <dd className="font-medium">{timeblock.assignedTo}</dd>
                </dl>
                {timeblock.details ? (
                    <div className="mb-3 text-sm">
                        <p className="text-muted-foreground mb-1">Notes</p>
                        <pre className="font-sans whitespace-pre-wrap">{timeblock.details}</pre>
                    </div>
                ) : null}
                <div className="grid grid-cols-2 gap-2">
                {timeblock?.foodItems?.map((food) => (
                    <div className="border-1 mt-3 px-2 py-1" key={food.id}>
                        <h3 className="pb-1 font-bold text-sm">{food.name}</h3>
                        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                            <dt className="text-muted-foreground">Service Style</dt>
                            <dd className="font-medium">{ food.serviceStyle }</dd>

                            <dt className="text-muted-foreground">Qty</dt>
                            <dd className="font-medium">{ food.quantity }</dd>
                        </dl>
                        {food?.includes && (
                            <div className="mt-3 pt-3 border-t text-sm">
                                <p className="text-muted-foreground mb-1">Notes</p>
                                <pre className="font-sans whitespace-pre-wrap">{food.includes}</pre>
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
