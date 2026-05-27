import React from "react"

import type { BeverageItem } from "~/definitions/database"
import { ITER_BEVERAGE_SERVICE_STYLE } from "~/definitions/sections/section-constants"
import { useBeverageSection } from "~/hooks/useBeverageSection"
import PlanningWorkspaceTimeblockList from "./PlanningWorkspaceTimeblocks/PlanningWorkspaceTimeblockList"

const BeverageWorkspaceSection: React.FC = () => {
  const {
    data: timeblocks = [],
    isLoading,
    addTimeblock,
    updateTimeblock,
    removeTimeblock,
    addItem,
    updateItem,
    removeItem,
  } = useBeverageSection()

  return (
    <PlanningWorkspaceTimeblockList<BeverageItem>
      sectionTitle="Beverage Planning"
      noTimeblocksCopy="No beverage timeblocks yet."
      emptyItemsCopy="No beverage items have been added to this timeblock."
      addTimeblockLabel="Add Timeblock"
      addItemLabel="Add Item"
      titlePlaceholder="e.g. Cocktail Hour, Toast"
      serviceStyleOptions={ITER_BEVERAGE_SERVICE_STYLE}
      timeblocks={timeblocks}
      isLoading={isLoading}
      getItems={(timeblock) => timeblock.beverageItems ?? []}
      addTimeblock={() => addTimeblock({ title: "" })}
      updateTimeblock={updateTimeblock}
      removeTimeblock={removeTimeblock}
      addItem={({ timeblockId }) => addItem({ timeblockId, newItem: { name: "" } })}
      updateItem={updateItem}
      removeItem={removeItem}
    />
  )
}

export default BeverageWorkspaceSection
