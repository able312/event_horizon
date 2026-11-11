import type { ReactNode } from "react"
import { ChevronDown, Plus } from "lucide-react"

import { Button } from "~/components/atoms/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "~/components/atoms/dropdown-menu"

type SplitAddButtonVariant = "light" | "header"

const STYLES: Record<SplitAddButtonVariant, { wrapper: string; main: string; chevron: string }> = {
  // Orange, for card headers (Drinks card, Settings menus)
  light: {
    wrapper: "inline-flex items-stretch",
    main: "inline-flex items-center gap-1 rounded-l-xs border border-r-0 border-orange-200 bg-orange-100 px-2 text-sm text-orange-700 hover:bg-orange-50 disabled:opacity-50",
    chevron: "inline-flex min-h-[22px] items-center rounded-r-xs border border-orange-200 bg-orange-100 px-2 text-orange-700 hover:bg-orange-50 disabled:opacity-50",
  },
  // Dark, for timeblock header bars
  header: {
    wrapper: "inline-flex h-full items-stretch",
    main: "h-full rounded-none border-x",
    chevron: "h-full rounded-none border-r border-stone-600 px-2 hover:bg-stone-600 hover:text-orange-400",
  },
}

type SplitAddButtonProps = {
  label: string
  /** The main button's action. */
  onAdd: () => void
  /** Accessible name of the chevron that opens the menu. */
  menuLabel: string
  /** The dropdown's items. */
  children: ReactNode
  variant?: SplitAddButtonVariant
  disabled?: boolean
}

/** An "Add Item ▾" button: the main part adds straight away, the chevron opens a menu of other ways to add. */
export const SplitAddButton: React.FC<SplitAddButtonProps> = ({
  label,
  onAdd,
  menuLabel,
  children,
  variant = "light",
  disabled = false,
}) => {
  const styles = STYLES[variant]
  const isHeader = variant === "header"

  return (
    <div className={styles.wrapper}>
      {isHeader ? (
        <Button type="button" variant="darkSecondary" className={styles.main} disabled={disabled} onClick={onAdd}>
          <Plus />
          {label}
        </Button>
      ) : (
        <button type="button" className={styles.main} disabled={disabled} onClick={onAdd}>
          <Plus size={14} />
          {label}
        </button>
      )}
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          {isHeader ? (
            <Button type="button" variant="darkSecondary" aria-label={menuLabel} disabled={disabled} className={styles.chevron}>
              <ChevronDown className="h-4 w-4" />
            </Button>
          ) : (
            <button type="button" aria-label={menuLabel} disabled={disabled} className={styles.chevron}>
              <ChevronDown size={14} />
            </button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onCloseAutoFocus={(event) => event.preventDefault()}>
          {children}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
