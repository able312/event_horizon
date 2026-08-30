import { useCallback, useState } from "react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/atoms/dialog"
import { Button } from "~/components/atoms/button"
import type { ConversionImpact } from "~/definitions/timeblocks/timeblock-conversion"
import type { TimeblockType } from "~/definitions/timeblocks/timeblocks-types"
import {
  getConversionTypeLabel,
  getDestinationOptions,
} from "~/definitions/timeblocks/timeblock-conversion"
import { useTimeblockConversion } from "~/hooks/useTimeblockConversion"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/atoms/dropdown-menu"
import { ArrowLeftRight } from "lucide-react"

interface TimeblockTypeConvertControlProps {
  eventId: string
  timeblockId: string
  currentType: TimeblockType
  disabled?: boolean
  onConverted?: (nextType: TimeblockType) => void
  /** When true, render as a dark header button (note editor / food header). */
  variant?: "header" | "menu-item"
}

export function TimeblockTypeConvertControl({
  eventId,
  timeblockId,
  currentType,
  disabled = false,
  onConverted,
  variant = "header",
}: TimeblockTypeConvertControlProps) {
  const { inspectConversion, convertSectionType, isBusy } = useTimeblockConversion(eventId)
  const [pendingImpact, setPendingImpact] = useState<ConversionImpact | null>(null)
  const [isConfirming, setIsConfirming] = useState(false)

  const destinations = getDestinationOptions(currentType)
  const controlsDisabled = disabled || isBusy || isConfirming

  const runConversion = useCallback(
    async (toType: TimeblockType, confirmDestructive = false) => {
      const result = await convertSectionType({
        timeblockId,
        toType,
        confirmDestructive,
      })
      onConverted?.(result.timeblock.sectionType)
      return result
    },
    [convertSectionType, onConverted, timeblockId],
  )

  const handleSelectDestination = useCallback(
    async (toType: TimeblockType) => {
      if (controlsDisabled) return

      try {
        const impact = await inspectConversion({ timeblockId, toType })
        if (impact.requiresConfirmation) {
          setPendingImpact(impact)
          return
        }
        await runConversion(toType, false)
      } catch {
        // Toasts handled in the conversion hook.
      }
    },
    [controlsDisabled, inspectConversion, runConversion, timeblockId],
  )

  const handleConfirm = useCallback(async () => {
    if (!pendingImpact) return
    setIsConfirming(true)
    try {
      await runConversion(pendingImpact.toType, true)
      setPendingImpact(null)
    } catch {
      // Keep dialog open on failure so the user can retry/cancel.
    } finally {
      setIsConfirming(false)
    }
  }, [pendingImpact, runConversion])

  const handleCancel = useCallback(() => {
    if (isConfirming) return
    setPendingImpact(null)
  }, [isConfirming])

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          {variant === "header" ? (
            <Button
              type="button"
              variant="darkSecondary"
              aria-label="Convert timeblock type"
              title="Convert timeblock type"
              disabled={controlsDisabled}
              className="rounded-none h-full m-0 border-r border-stone-600 hover:bg-stone-600 hover:text-orange-400"
            >
              <ArrowLeftRight className="h-4 w-4" />
              <span className="sr-only">{getConversionTypeLabel(currentType)}</span>
            </Button>
          ) : (
            <Button type="button" variant="ghost" disabled={controlsDisabled}>
              Convert type
            </Button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {destinations.map((destination) => (
            <DropdownMenuItem
              key={destination}
              disabled={controlsDisabled}
              onClick={() => {
                void handleSelectDestination(destination)
              }}
            >
              Convert to {getConversionTypeLabel(destination)}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={pendingImpact !== null} onOpenChange={(open) => (!open ? handleCancel() : undefined)}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Convert timeblock?</DialogTitle>
            <DialogDescription>
              {pendingImpact?.summary ??
                "This conversion will permanently delete specialized data."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancel} disabled={isConfirming}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void handleConfirm()} disabled={isConfirming}>
              {isConfirming ? "Converting..." : "Convert and delete data"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default TimeblockTypeConvertControl
