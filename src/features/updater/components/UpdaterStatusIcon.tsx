import type { ReactNode } from "react"

import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/atoms/tooltip"

interface UpdaterStatusIconProps {
  label: string
  children: ReactNode
}

export const UpdaterStatusIcon: React.FC<UpdaterStatusIconProps> = ({ label, children }) => {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          role="img"
          tabIndex={0}
          aria-label={label}
          className="flex size-6 items-center justify-center rounded-full"
        >
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  )
}
