import React, { useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Edit, Trash2 } from "lucide-react"
import type { Event } from "~/definitions/database"

type EventItemContextMenuProps = {
  event: Event
  onEdit?: (event: Event) => void
  onDelete?: (eventId: string) => void
  children: React.ReactNode
}

type MenuPosition = {
  x: number
  y: number
}

const MENU_WIDTH = 176
const MENU_HEIGHT = 96
const VIEWPORT_PADDING = 8

function clampMenuPosition(position: MenuPosition): MenuPosition {
  if (typeof window === "undefined") return position

  return {
    x: Math.min(
      Math.max(VIEWPORT_PADDING, position.x),
      window.innerWidth - MENU_WIDTH - VIEWPORT_PADDING,
    ),
    y: Math.min(
      Math.max(VIEWPORT_PADDING, position.y),
      window.innerHeight - MENU_HEIGHT - VIEWPORT_PADDING,
    ),
  }
}

function EventItemContextMenu({
  event,
  onEdit,
  onDelete,
  children,
}: EventItemContextMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState<MenuPosition>({ x: 0, y: 0 })
  const menuRef = useRef<HTMLDivElement | null>(null)
  const hasActions = useMemo(() => Boolean(onEdit || onDelete), [onDelete, onEdit])

  useEffect(() => {
    if (!isOpen) return

    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current) return
      if (menuRef.current.contains(event.target as Node)) return
      setIsOpen(false)
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false)
      }
    }

    window.addEventListener("mousedown", handlePointerDown)
    window.addEventListener("keydown", handleEscape)

    return () => {
      window.removeEventListener("mousedown", handlePointerDown)
      window.removeEventListener("keydown", handleEscape)
    }
  }, [isOpen])

  const handleContextMenu = (contextEvent: React.MouseEvent) => {
    if (!hasActions) return

    contextEvent.preventDefault()
    contextEvent.stopPropagation()

    setPosition(
      clampMenuPosition({
        x: contextEvent.clientX,
        y: contextEvent.clientY,
      }),
    )
    setIsOpen(true)
  }

  const handleEditClick = (clickEvent: React.MouseEvent) => {
    clickEvent.preventDefault()
    clickEvent.stopPropagation()
    setIsOpen(false)
    onEdit?.(event)
  }

  const handleDeleteClick = (clickEvent: React.MouseEvent) => {
    clickEvent.preventDefault()
    clickEvent.stopPropagation()
    setIsOpen(false)
    onDelete?.(event.id)
  }

  return (
    <>
      <div className="block" onContextMenu={handleContextMenu}>
        {children}
      </div>
      {isOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            className="fixed z-50 min-w-40 rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
            style={{ left: position.x, top: position.y }}
            onContextMenu={(event) => {
              event.preventDefault()
              event.stopPropagation()
            }}
          >
            {onEdit ? (
              <button
                type="button"
                role="menuitem"
                className="focus:bg-accent focus:text-accent-foreground flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-hidden"
                onClick={handleEditClick}
              >
                <Edit className="size-4" />
                Edit
              </button>
            ) : null}
            {onDelete ? (
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm text-destructive outline-hidden hover:bg-destructive/10 focus:bg-destructive/10"
                onClick={handleDeleteClick}
              >
                <Trash2 className="size-4" />
                Delete
              </button>
            ) : null}
          </div>,
          document.body,
        )}
    </>
  )
}

export default EventItemContextMenu
