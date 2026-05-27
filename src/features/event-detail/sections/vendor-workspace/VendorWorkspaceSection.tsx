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
                    <p className="text-xs text-muted-foreground">One entry for each vendor with delivery times, contact information and </p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={ () => addVendor() }>
                    <Plus />
                    Add New Vendor
                </Button>
            </div>

            {/* Timeblock Cards */}
            <div className="flex flex-col gap-12">
                { !vendorItems?.length || vendorItems.length < 1 ? (
                    <div className="rounded-xs border border-dashed border-border bg-orange-50 px-4 py-4">
                        <p className="text-sm text-muted-foreground">No Vendor Timeblocks. Create one in the top right corner to get started.</p>
                    </div>
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
        </div>
    )
}

export default VendorWorkspaceSection