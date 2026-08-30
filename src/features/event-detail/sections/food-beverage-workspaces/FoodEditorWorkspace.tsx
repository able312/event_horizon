import { useParams } from "react-router"

import type { FoodItem } from "~/definitions/database"
import type { TimeblockWithItems } from "~/definitions/timeblocks/timeblocks-types"
import { ITER_FOOD_SERVICE_STYLE } from "~/definitions/sections/section-constants"
import { useFoodSection } from "~/hooks/useFoodSection"
import PlanningWorkspaceTimeblockCard from "~/features/event-detail/sections/food-beverage-workspaces/PlanningWorkspaceTimeblocks/PlanningWorkspaceTimeblockCard"
import FoodBevHeaderTail from "~/features/event-detail/sections/food-beverage-workspaces/PlanningWorkspaceTimeblocks/FoodBevHeaderTail"
import TimeblockTypeConvertControl from "~/features/event-detail/sections/setup-notes-workspaces/TimeblockTypeConvertControl"

interface FoodEditorWorkspaceProps {
  timeblock: TimeblockWithItems
  onDeleted: () => void
}

const FoodEditorWorkspace: React.FC<FoodEditorWorkspaceProps> = ({
  timeblock,
  onDeleted,
}) => {
  const { id: eventId } = useParams()
  const {
    updateTimeblock,
    removeTimeblock,
    addItem,
    updateItem,
    removeItem,
    isMutating,
  } = useFoodSection()

  const items = (timeblock.foodItems ?? []) as FoodItem[]

  return (
    <div className="h-full min-h-0 overflow-y-auto bg-stone-100 p-4">
      <PlanningWorkspaceTimeblockCard
        sectionTitle="Food"
        emptyItemsCopy="No menu items have been added to this timeblock."
        addItemLabel="Add Item"
        titlePlaceholder="e.g. Dinner, Lunch, Appetizers"
        serviceStyleOptions={ITER_FOOD_SERVICE_STYLE}
        timeblock={timeblock}
        items={items}
        disabled={isMutating}
        updateTimeblock={updateTimeblock}
        removeTimeblock={(id) => {
          removeTimeblock(id, {
            onSuccess: () => onDeleted(),
          })
        }}
        addItem={({ timeblockId }) => addItem({ timeblockId })}
        updateItem={updateItem}
        removeItem={removeItem}
        headerTail={
          <>
            {eventId ? (
              <TimeblockTypeConvertControl
                eventId={eventId}
                timeblockId={timeblock.id}
                currentType={timeblock.sectionType}
                disabled={isMutating}
              />
            ) : null}
            <FoodBevHeaderTail
              title={timeblock.title ?? "Untitled"}
              timeblockItems={items}
              addItemLabel="Add Item"
              disabled={isMutating}
              deleteTimeblock={() => {
                removeTimeblock(timeblock.id, {
                  onSuccess: () => onDeleted(),
                })
              }}
              addItem={() => addItem({ timeblockId: timeblock.id })}
            />
          </>
        }
      />
    </div>
  )
}

export default FoodEditorWorkspace
