import type { WorkspaceCategoryId } from "../types"
import { getAvailableWorkspaceCategories } from "../lib/navPolicy"
import { Button } from "~/components/atoms/button"

interface WorkspaceCategoryIconMenuProps {
  eventType: string | undefined
  selectedCategoryId: WorkspaceCategoryId | null
  onSelectCategory: (categoryId: WorkspaceCategoryId) => void
}

const WorkspaceCategoryIconMenu: React.FC<WorkspaceCategoryIconMenuProps> = ({
  eventType,
  selectedCategoryId,
  onSelectCategory,
}) => {
  const categories = getAvailableWorkspaceCategories(eventType)

  return (
    <nav
      className="flex items-center justify-between gap-1"
      aria-label="Workspace sections"
      data-testid="workspace-category-icon-menu"
    >
      {categories.map((category) => {
        const Icon = category.icon
        const isActive = selectedCategoryId === category.id

        return (
          <Button
            key={category.id}
            type="button"
            variant="ghost"
            size="icon"
            aria-label={category.label}
            aria-current={isActive ? "page" : undefined}
            title={category.label}
            onClick={() => onSelectCategory(category.id)}
            className={
              isActive
                ? "text-orange-500 hover:text-orange-400"
                : "text-stone-300 hover:text-white"
            }
          >
            <Icon className="h-5 w-5" />
          </Button>
        )
      })}
    </nav>
  )
}

export default WorkspaceCategoryIconMenu
