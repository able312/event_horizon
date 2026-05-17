import React from "react"
import { Plus } from "lucide-react"
import { useVendorSection } from "~/hooks/useVendorSection"
import { Input } from "~/components/ui/input"
import DetailsTimeblock from "~/components/ui/DetailsTimeblock"
import type { UpdateTimeblock } from "~/definitions/database"

const VendorsSection: React.FC = () => {
  const {
    data: vendors = [],
    addVendor,
    updateVendor,
    updateTimeblock,
    removeTimeblock,
  } = useVendorSection()

  const handleUpdateTimeblock = (id: string, updates: UpdateTimeblock) => {
    updateTimeblock({id, updates})
  }
  const handleRemoveTimeblock = (id: string) => {
    removeTimeblock(id)
  }

  return (
    <div className="space-y-6">
      <div>
        <h4 className="font-medium text-sm mb-3">Vendors</h4>
        
        {vendors.length === 0 ? (
          <p className="text-muted-foreground text-sm">No vendors added yet.</p>
        ) : (
          <div className="space-y-4">
            {vendors.map(timeblock => (
                <DetailsTimeblock
                  key={timeblock.id}
                  timeblock={timeblock}
                  titlePlaceholder="Vendor title.."
                  onEdit={handleUpdateTimeblock}
                  onRemove={handleRemoveTimeblock}
                >

                <div className="mt-4 space-y-3">
                  <div className="">
                  {( timeblock.vendorItem && timeblock.vendorItem?.id?.length > 0) ? 
                    (<>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-muted-foreground">Contact Name</label>
                          <input
                            type="text"
                            defaultValue={timeblock.vendorItem?.contactName || ""}
                            onBlur={(e) => updateVendor({ id: timeblock.vendorItem!.id, updates: { contactName: e.target.value } })}
                            placeholder="Contact name"
                            className="w-full px-2 py-1 text-sm border rounded bg-white"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Contact Phone</label>
                          <input
                            type="tel"
                            defaultValue={timeblock.vendorItem?.contactPhone || ""}
                            onBlur={(e) => updateVendor({ id: timeblock.vendorItem!.id, updates: { contactPhone: e.target.value } })}
                            placeholder="(555) 123-4567"
                            className="w-full px-2 py-1 text-sm border rounded bg-white"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Contact Email</label>
                          <input
                            type="email"
                            defaultValue={timeblock.vendorItem?.contactEmail || ""}
                            onBlur={(e) => updateVendor({ id: timeblock.vendorItem!.id, updates: { contactEmail: e.target.value } })}
                            placeholder="email@example.com"
                            className="w-full px-2 py-1 text-sm border rounded bg-white"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="text-xs text-muted-foreground">Notes</label>
                          <Input
                            type="text"
                            defaultValue={timeblock.vendorItem?.notes || ""}
                            onBlur={(e) => updateVendor({ id: timeblock.vendorItem!.id, updates: { notes: e.target.value } })}
                            placeholder="Setup notes, what they need from us..."
                            className="w-full px-2 py-1 text-sm border rounded bg-white"
                          />
                        </div>
                      </div>
                    </>) : 
                    (<>an uknown error occured... {timeblock.vendorItem?.id} </>)}
                  </div>
                </div>
                </DetailsTimeblock>
            ))}
          </div>
        )}
        
        <button
          onClick={() => addVendor()}
          className="mt-2 text-sm text-primary hover:underline flex items-center gap-1"
        >
          <Plus size={14} /> Add Vendor
        </button>
      </div>
    </div>
  )
}

export default VendorsSection
