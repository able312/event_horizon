import { Link } from "react-router"

import { cn } from "~/lib/utils"

import { groupSettingsCategories, settingsPath, type SettingsCategoryId } from "../lib/settingsCategories"

type SettingsNavProps = {
  activeCategoryId: SettingsCategoryId
}

/** The sidebar list of settings categories, grouped by whose settings they are. */
export const SettingsNav: React.FC<SettingsNavProps> = ({ activeCategoryId }) => (
  <nav aria-label="Settings categories" className="space-y-4 p-2">
    {groupSettingsCategories().map((group) => (
      <div key={group.id} className="space-y-1">
        <h2 className="px-2 text-[11px] font-semibold uppercase tracking-wide text-stone-500">{group.label}</h2>
        <ul>
          {group.categories.map((category) => {
            const isActive = category.id === activeCategoryId
            return (
              <li key={category.id}>
                <Link
                  to={settingsPath(category.id)}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "block rounded-md px-2 py-1.5 text-sm transition-colors",
                    isActive ? "bg-white/10 text-white" : "text-stone-300 hover:bg-white/5 hover:text-white",
                  )}
                >
                  {category.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    ))}
  </nav>
)
