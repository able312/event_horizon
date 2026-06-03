import React from "react"

import type { FoodItem } from "~/definitions/database"
import { ITER_FOOD_SERVICE_STYLE } from "~/definitions/sections/section-constants"
import { useFoodSection } from "~/hooks/useFoodSection"
import PlanningWorkspaceTimeblockList from "./PlanningWorkspaceTimeblocks/PlanningWorkspaceTimeblockList"

const FoodWorkspaceSection: React.FC = () => {
  const {
    data: timeblocks = [],
    isLoading,
    addTimeblock,
    updateTimeblock,
    removeTimeblock,
    addItem,
    updateItem,
    removeItem,
  } = useFoodSection()

  return (
    <PlanningWorkspaceTimeblockList<FoodItem>
      sectionTitle="Food Planning"
      noTimeblocksCopy="No food timeblocks yet."
      emptyItemsCopy="No menu items have been added to this timeblock."
      addTimeblockLabel="Add Timeblock"
      addItemLabel="Add Item"
      titlePlaceholder="e.g. Dinner, Lunch, Appetizers"
      serviceStyleOptions={ITER_FOOD_SERVICE_STYLE}
      timeblocks={timeblocks}
      isLoading={isLoading}
      getItems={(timeblock) => timeblock.foodItems ?? []}
      addTimeblock={() => addTimeblock()}
      updateTimeblock={updateTimeblock}
      removeTimeblock={removeTimeblock}
      addItem={({ timeblockId }) => addItem({ timeblockId })}
      updateItem={updateItem}
      removeItem={removeItem}
    />
  )
}

export default FoodWorkspaceSection
