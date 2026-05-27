import React from "react"
import { Plus } from "lucide-react"
import { type BeverageItem, type UpdateTimeblock } from "~/definitions/database"
import { useBeverageSection } from "~/hooks/useBeverageSection"
import GenericItemCard from "~/components/atoms/GenericItemCard"
import { ITER_BEVERAGE_SERVICE_STYLE } from "~/definitions/sections/section-constants"
import DetailsTimeblock from "~/components/atoms/DetailsTimeblock"

const BeverageSection: React.FC = () => {
  const {
    data: timeblocks = [],
    addTimeblock,
    updateTimeblock,
    removeTimeblock,
    addItem,
    updateItem,
    removeItem,
  } = useBeverageSection()

  const handleUpdateTimeblock = (id: string, updates: UpdateTimeblock) => {
    updateTimeblock({id, updates})
  }
  const handleRemoveTimeblock = (id: string) => {
    removeTimeblock(id)
  }
  
  const handleAddBeverageItem = (timeblockId: string) => {
    addItem({ timeblockId, newItem: { name: "" } })
  }

  const handleUpdateBeverageItem = (timeblockId: string, itemId: string, field: keyof BeverageItem, value: string | number) => {
    updateItem({ timeblockId, itemId, updates: { [field]: value } })
  }

  const handleAddTimeblock = () => {
    addTimeblock()
  }

  return (
    <div className="space-y-6">
      <div>
        <h4 className="font-medium text-sm mb-3">Beverage Timeblocks</h4>
        
        {timeblocks && timeblocks.length === 0 ? (
          <p className="text-muted-foreground text-sm">No timeblocks added yet.</p>
        ) : (
          <div className="space-y-4">
            {timeblocks.map((timeblock) => (
                <DetailsTimeblock
                  key={timeblock.id}
                  timeblock={timeblock}
                  titlePlaceholder="e.g. Beer, Wine or Peurto Elguino Cereza, Vodka"
                  onEdit={handleUpdateTimeblock}
                  onRemove={handleRemoveTimeblock}
                >

                  {timeblock?.beverageItems?.length === 0 ? (
                    <p className="text-muted-foreground text-xs">No items in this timeblock.</p>
                  ) : (
                    <div className="gap-4 grid grid-cols-1 md:grid-cols-1">
                      {timeblock?.beverageItems?.map((item) => (
                        <GenericItemCard
                          key={item.id}
                          item={item}
                          updateItem={(field, value) => handleUpdateBeverageItem(timeblock.id, item.id, field, value ?? '')}
                          removeItem={() => removeItem({ timeblockId: timeblock.id, itemId: item.id })}
                          serviceStyleOptions={ITER_BEVERAGE_SERVICE_STYLE}
                          color="blue"
                        />
                      ))}
                    </div>
                  )}
                  
                  <button
                    onClick={() => handleAddBeverageItem(timeblock.id)}
                    className="ml-14 mt-2 text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    <Plus size={14} /> Add Item
                  </button>
                </DetailsTimeblock>
            ))}
            </div>
        )}
        
        <button
          onClick={handleAddTimeblock}
          className="mt-2 text-sm text-primary hover:underline flex items-center gap-1"
        >
          <Plus size={14} /> Add Timeblock
        </button>
      </div>
    </div>
  )
}

export default BeverageSection
