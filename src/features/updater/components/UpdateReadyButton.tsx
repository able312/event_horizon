import { useState } from "react"
import { CircleArrowUp } from "lucide-react"

import { cn } from "~/lib/utils"

import { RestartConfirmDialog } from "./RestartConfirmDialog"

interface UpdateReadyButtonProps {
  version: string
  installFailed?: boolean
  shouldAnnounce: boolean
  onAnnounced: () => void
  onInstall: () => void
  className?: string
}

export const UpdateReadyButton: React.FC<UpdateReadyButtonProps> = ({
  version,
  installFailed = false,
  shouldAnnounce,
  onAnnounced,
  onInstall,
  className,
}) => {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)

  const label = installFailed
    ? `Could not install v${version}. Click to try again`
    : `Update to v${version} and restart`
  const title = installFailed ? "Retry update" : "Update ready"
  const detail = installFailed ? `v${version} failed` : `Install v${version}`

  const handleConfirm = () => {
    setIsConfirmOpen(false)
    onInstall()
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsConfirmOpen(true)}
        onAnimationEnd={onAnnounced}
        aria-label={label}
        className={cn(
          "flex min-w-0 items-center gap-2 text-left transition-colors hover:bg-white/15 focus-visible:bg-white/15 focus-visible:outline-none",
          className,
        )}
      >
        <CircleArrowUp
          aria-hidden="true"
          className={cn("size-5 shrink-0", shouldAnnounce && "motion-safe:animate-update-bounce")}
        />
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="truncate text-sm font-semibold">{title}</span>
          <span className="truncate text-[11px] text-white/80">{detail}</span>
        </span>
      </button>

      <RestartConfirmDialog
        open={isConfirmOpen}
        version={version}
        onCancel={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirm}
      />
    </>
  )
}
