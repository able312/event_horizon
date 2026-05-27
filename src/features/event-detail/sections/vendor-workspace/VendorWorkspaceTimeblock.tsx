import { Trash2 } from "lucide-react"

import { Button } from "~/components/atoms/button"
import { Input } from "~/components/atoms/input"
import TimeblockHeader from "~/components/organisms/TimeblockHeader"
import DocumentStyleTextArea from "~/components/molecules/DocumentStyleTextarea"
import type { UpdateTimeblock, UpdateVendorItem } from "~/definitions/database"

interface VendorWorkspaceTimeblockProps {
    timeblockID: string,
    vendorItemID: string,
    title: string,
    time: string,
    assignedTo: string,
    contactName: string,
    contactPhone: string,
    contactEmail: string,
    notes: string,
    updateTimeblock: (payload: {id: string, updates: UpdateTimeblock}) => void,
    deleteTimeblock: () => void
    updateVendor: (payload: {id: string, updates: UpdateVendorItem}) => void,
}

const VendorWorkspaceTimeblock:React.FC<VendorWorkspaceTimeblockProps> = ({
    timeblockID,
    vendorItemID,
    title,
    time,
    assignedTo,
    contactName,
    contactPhone,
    contactEmail,
    notes,
    updateTimeblock,
    deleteTimeblock,
    updateVendor,
}) => {
    
    if (!timeblockID) return(
         <div className="rounded-xs border border-dashed border-border bg-red-50 px-4 py-4">
          <p className="text-sm text-muted-foreground">An error occured loading this timeblock.</p>
        </div>
    )

    return (


        <div className="shadow-sm">
            <TimeblockHeader
                timeblockID={ timeblockID }
                time={ time }
                title={ title }
                sectionTitle="Vendor"
                assignedTo={assignedTo}
                titlePlaceholder="Vendor Title"
                tail={
                    <Button
                        variant="darkSecondary"
                        aria-label="Delete vendor timeblock"
                        className=" rounded-none rounded-tr-xs h-full m-0 hover:bg-stone-600 hover:text-red-600"
                        onClick={ deleteTimeblock }
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                }
                updateTimeblock={ updateTimeblock }
            />
            
            {/* Timeblock Body */}
            

            {vendorItemID ? (<div className="grid grid-cols-[1fr_2fr] border-r border-stone-300">
                {/* Form */}
                <div className="p-6 relative z-5 shadow-[4px_0_10px_-3px_rgb(0,0,0,0.1)] bg-stone-50 border-l border-stone-300 flex flex-col gap-6">
                    <label className="text-xs text-muted-foreground">
                        <p className="pb-2">Contact Name</p>
                        <Input
                            type="text"
                            defaultValue={ contactName }
                            onBlur={(e) => updateVendor({id: vendorItemID, updates: {contactName: e.target.value} })}
                            placeholder="Contact's name"
                            aria-label="Vendor contact name"
                            className="w-full px-2 py-1 text-sm border rounded bg-white"
                        />
                    </label>

                    <label className="text-xs text-muted-foreground">
                        <p className="pb-2">Phone Number</p>
                        <Input
                            type="text"
                            defaultValue={ contactPhone }
                            onBlur={(e) => updateVendor({id: vendorItemID, updates: {contactPhone: e.target.value} })}
                            placeholder="Contact's phone number"
                            aria-label="Vendor contact's phone number"
                            className="w-full px-2 py-1 text-sm border rounded bg-white"
                        />
                    </label>

                    <label className="text-xs text-muted-foreground">
                        <p className="pb-2">Email</p>
                        <Input
                            type="text"
                            defaultValue={ contactEmail }
                            onBlur={(e) => updateVendor({id: vendorItemID, updates: {contactEmail: e.target.value} })}
                            placeholder="Contact's email"
                            aria-label="Vendor contact's email"
                            className="w-full px-2 py-1 text-sm border rounded bg-white"
                        />
                    </label>
                </div>

                {/* Text Input */}
                <DocumentStyleTextArea
                    className="max-h-[252px]"
                    placeholderText="What else do we need to know about the vendor?"
                    content={ notes }
                    updateContentSource={ (content: string) => updateTimeblock({id: timeblockID, updates: { details: content }}) }
                />
            </div>) : (
                <div className="rounded-xs border border-dashed border-border bg-red-50 px-4 py-4">
                    <p className="text-sm text-muted-foreground">Error: Could not find a matching entry in the database for this timeblock.</p>
                </div>
            )}
        </div>
    )
}

export default VendorWorkspaceTimeblock