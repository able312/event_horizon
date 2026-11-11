import type { FoodMenuCategory } from "~/definitions/database"
import type { FoodMenuFilter as FoodMenuFilterValue } from "~/lib/foodMenu/foodMenu"

type FoodMenuFilterProps = {
  /** All categories, already sorted. */
  categories: readonly FoodMenuCategory[]
  value: FoodMenuFilterValue
  onChange: (value: FoodMenuFilterValue) => void
}

/** Pills that narrow the food items table to one category (or to items with none). */
export const FoodMenuFilter: React.FC<FoodMenuFilterProps> = ({ categories, value, onChange }) => {
  const options: { value: FoodMenuFilterValue; label: string }[] = [
    { value: "all", label: "All items" },
    ...categories.map((category) => ({ value: category.id, label: category.name })),
    { value: "none", label: "No category" },
  ]

  return (
    <div role="group" aria-label="Show category" className="flex flex-wrap gap-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={`rounded-xs border px-2 py-0.5 text-xs ${
            value === option.value
              ? "border-orange-300 bg-orange-100 text-orange-800"
              : "border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
