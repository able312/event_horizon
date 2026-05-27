import { Plus } from "lucide-react"
import { Button } from "~/components/atoms/button"
import VendorWorkspaceTimeblock from "./VendorWorkspaceTimeblock"
import { useVendorSection } from "~/hooks/useVendorSection"

const VendorWorkspaceSection = () => {

    const { data, updateTimeblock, addVendor, updateVendor, removeTimeblock } = useVendorSection()

    const vendorItems = data ?? []

    return(
        <div className="space-y-4">

            {/* Page Title */}
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h3 className="text-sm font-semibold tracking-wide">Vendors</h3>
                    <p className="text-xs text-muted-foreground">Grouped by timeblock with inline planning and pricing edits.</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={ () => addVendor() }>
                    <Plus />
                    Add New Vendor
                </Button>
            </div>

            {/* Mock Timeblock Card */}
            {vendorItems?.length && vendorItems.length < 1 ? (
                <div>No Timeblocks</div>
            ) : (    
                vendorItems.map((item) => (
                    <VendorWorkspaceTimeblock 
                        key={item.id + "_" +item?.vendorItem?.id}
                        timeblockID={ item.id }
                        vendorItemID={ item?.vendorItem?.id ?? "" }
                        title={ item.title }
                        time={ item.time ?? "" }
                        assignedTo={ item.assignedTo ?? "" }
                        contactName={ item.vendorItem?.contactName ?? "" }
                        contactPhone={ item.vendorItem?.contactPhone ?? "" }
                        contactEmail={ item.vendorItem?.contactEmail ?? "" }
                        notes={ item.details ?? ""}
                        updateTimeblock={ updateTimeblock }
                        deleteTimeblock={ () => removeTimeblock( item.id ) }
                        updateVendor={ updateVendor }
                    />
                ))
            )}
        </div>
    )
}

export default VendorWorkspaceSection