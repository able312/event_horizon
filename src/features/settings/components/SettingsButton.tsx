import { Settings } from "lucide-react"
import { useLocation, useNavigate } from "react-router"

import { Button } from "~/components/atoms/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/atoms/tooltip"
import { cn } from "~/lib/utils"

import { settingsPath } from "../lib/settingsCategories"

type SettingsButtonProps = {
  className?: string
}

/** The gear in the sidebar footer that opens Settings; highlighted while Settings is open. */
export const SettingsButton: React.FC<SettingsButtonProps> = ({ className }) => {
  const navigate = useNavigate()
  const isActive = useLocation().pathname.startsWith("/settings")

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Open settings"
          aria-current={isActive ? "page" : undefined}
          onClick={() => navigate(settingsPath())}
          className={cn(
            "size-6 transition-colors",
            isActive ? "text-orange-500" : "text-stone-400 hover:text-white",
            className,
          )}
        >
          <Settings className="size-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">Settings</TooltipContent>
    </Tooltip>
  )
}
