import { useState } from "react"
import { CircleArrowUp } from "lucide-react"

import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/atoms/tooltip"
import { cn } from "~/lib/utils"

import { RestartConfirmDialog } from "./RestartConfirmDialog"

interface UpdateReadyButtonProps {
  version: string
  installFailed?: boolean
  shouldAnnounce: boolean
  onAnnounced: () => void
  onInstall: () => void
}

export const UpdateReadyButton: React.FC<UpdateReadyButtonProps> = ({
  version,
  installFailed = false,
  shouldAnnounce,
  onAnnounced,
  onInstall,
}) => {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)

  const label = installFailed
    ? `Could not install v${version}. Click to try again`
    : `Update to v${version} and restart`

  const handleConfirm = () => {
    setIsConfirmOpen(false)
    onInstall()
  }

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => setIsConfirmOpen(true)}
            onAnimationEnd={onAnnounced}
            aria-label={label}
            className={cn(
              "flex size-6 items-center justify-center rounded-full text-orange-500 transition-colors hover:text-orange-400",
              shouldAnnounce && "motion-safe:animate-update-bounce",
            )}
          >
            <CircleArrowUp className="size-5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">{label}</TooltipContent>
      </Tooltip>

      <RestartConfirmDialog
        open={isConfirmOpen}
        version={version}
        onCancel={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirm}
      />
    </>
  )
}
