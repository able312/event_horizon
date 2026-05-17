import { useVendorSection } from "~/hooks/useVendorSection"

export const VendorDetails = () => {
    
    const { data: vendors } = useVendorSection()
    const sortedTimeblocks = vendors?.sort((a, b) => {
        const timeA = a.time ?? ""
        const timeB = b.time ?? ""
        return timeA.localeCompare(timeB)
    })
    
    return (
        <>
           {sortedTimeblocks?.map((vendor) => (<div key={vendor.id}>
                
                <div className="flex justify-between border-b-1 pb-2">
                    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm pb-2">
                        <dd className="font-medium col-span-2">{vendor.title}</dd>

                        <dt className="text-muted-foreground">Time of Arrival</dt>
                        <dd className="font-medium">{vendor.time}</dd>

                        <dt className="text-muted-foreground">Assigned to</dt>
                        <dd className="font-medium">{vendor.assignedTo}</dd>
                    </dl>

                    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">

                        <dt className="text-muted-foreground">Contact Name</dt>
                        <dd className="font-medium">{vendor.vendorItem?.contactName}</dd>

                        <dt className="text-muted-foreground">Contact Phone</dt>
                        <dd className="font-medium">{vendor.vendorItem?.contactPhone}</dd>

                        <dt className="text-muted-foreground">Contact Email</dt>
                        <dd className="font-medium">{vendor.vendorItem?.contactEmail}</dd>
                    </dl>  
                </div>

                {vendor.vendorItem?.notes && (
                    <div className="text-sm pb-4">
                        <p className="text-muted-foreground mb-1">Notes</p>
                        <pre className="font-sans whitespace-pre-wrap">{vendor.vendorItem.notes}</pre>
                    </div>
                )}    

                  
            </div>))}
        </>
    )
}