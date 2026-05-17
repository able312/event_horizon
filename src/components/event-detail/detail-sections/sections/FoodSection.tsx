import React from "react"
import { Plus } from "lucide-react"
import type { FoodItem, UpdateTimeblock } from "~/definitions/database"
import { useFoodSection } from "~/hooks/useFoodSection"
import GenericItemCard from "~/components/ui/GenericItemCard"
import { ITER_FOOD_SERVICE_STYLE } from "~/definitions/sections/section-constants"
import DetailsTimeblock from "~/components/ui/DetailsTimeblock"

const FoodSection: React.FC = () => {
  const { data: timeblocks, isLoading, addTimeblock, updateTimeblock, removeTimeblock, addItem, updateItem, removeItem } = useFoodSection()

  const handleUpdateTimeblock = (id: string, updates: UpdateTimeblock) => {
    updateTimeblock({ id, updates })
  }

  const handleRemoveTimeblock = (id: string) => {
    removeTimeblock(id)
  }

  const handleAddFoodItem = (timeblockId: string) => {
    addItem({ timeblockId })
  }

  const handleUpdateFoodItem = (timeblockId: string, itemId: string, field: keyof FoodItem, value: string | number) => {
    updateItem({ timeblockId, itemId, updates: { [field]: value } })
  }

  const handleRemoveFoodItem = (timeblockId: string, itemId: string) => {
    removeItem({ timeblockId, itemId })
  }

  if (isLoading) {
    return <div className="w-full">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h4 className="font-medium text-sm mb-3">Menu Timeblocks</h4>
        
        {(!timeblocks || timeblocks.length === 0) ? (
          <p className="text-muted-foreground text-sm">No timeblocks added yet.</p>
        ) : (
          <div className="space-y-4">
            {timeblocks.map((timeblock) => (
              <DetailsTimeblock
                key={timeblock.id}
                timeblock={timeblock}
                titlePlaceholder="e.g. Dinner, Lunch, Appetizers"
                onEdit={handleUpdateTimeblock}
                onRemove={handleRemoveTimeblock}

              >
                
                {(timeblock.foodItems ?? []).length === 0 ? (
                  <p className="text-muted-foreground text-xs">No menu items have been added to this timeblock.</p>
                ) : (
                  <div className="gap-4 grid grid-cols-3">
                    {timeblock.foodItems?.map((item) => (
                      <GenericItemCard
                        key={item.id}
                        item={item}
                        updateItem={(field, value) => handleUpdateFoodItem(timeblock.id, item.id, field, value ?? "")}
                        removeItem={() => handleRemoveFoodItem(timeblock.id, item.id)}
                        serviceStyleOptions={ITER_FOOD_SERVICE_STYLE}
                        color="amber"
                      />
                    ))}
                  </div>
                )}
                
                <button
                  onClick={() => handleAddFoodItem(timeblock.id)}
                  className="mt-2 text-sm text-primary hover:underline flex items-center gap-1"
                >
                  <Plus size={14} /> Add Item
                </button>
              </DetailsTimeblock>
            ))}
          </div>
        )}
        
        <button
          onClick={() => addTimeblock()}
          className="mt-2 text-sm text-primary hover:underline flex items-center gap-1"
        >
          <Plus size={14} /> Add Timeblock
        </button>
      </div>
    </div>
  )
}

export default FoodSection
