import { Button } from "~/components/atoms/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/atoms/dialog"
import type { FoodMenuCategory } from "~/definitions/database"

type DeleteFoodMenuCategoryDialogProps = {
  category: FoodMenuCategory | null
  /** How many saved items carry the category. */
  itemCount: number
  onCancel: () => void
  onConfirm: () => void
}

/** Confirms deleting a category that saved items still use; the items themselves stay. */
export const DeleteFoodMenuCategoryDialog: React.FC<DeleteFoodMenuCategoryDialogProps> = ({
  category,
  itemCount,
  onCancel,
  onConfirm,
}) => (
  <Dialog open={category !== null} onOpenChange={(open) => (!open ? onCancel() : undefined)}>
    <DialogContent showCloseButton={false}>
      <DialogHeader>
        <DialogTitle>Delete "{category?.name}"?</DialogTitle>
        <DialogDescription>
          {itemCount} saved food item{itemCount === 1 ? " is" : "s are"} in this category. The items stay on the food
          menu; only the category is removed from them.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="destructive" onClick={onConfirm}>
          Delete category
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
)
