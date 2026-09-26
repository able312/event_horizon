import type { ContactRoleType, VendorCategorySummary } from "~/definitions/contacts"
import { cn } from "~/lib/utils"

import { getAvatarClass } from "../lib/contactStyles"

type ContactAvatarProps = {
  initials: string
  role: ContactRoleType
  vendorCategory: VendorCategorySummary | null
  className?: string
}

export const ContactAvatar: React.FC<ContactAvatarProps> = ({ initials, role, vendorCategory, className }) => (
  <span
    aria-hidden
    className={cn(
      "inline-flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold tracking-tight",
      getAvatarClass(role, vendorCategory),
      className,
    )}
  >
    {initials}
  </span>
)
