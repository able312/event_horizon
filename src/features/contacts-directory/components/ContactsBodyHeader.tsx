import { ArrowLeft } from "lucide-react"
import type { ReactNode } from "react"

import { Body } from "~/components/layouts/SplitLayout"

type ContactsBodyHeaderProps = {
  onBack: () => void
  children?: ReactNode
}

/** Body header with the back button pinned to the start; children fill the remaining space. */
export const ContactsBodyHeader: React.FC<ContactsBodyHeaderProps> = ({ onBack, children }) => (
  <Body.Header>
    <button
      type="button"
      onClick={onBack}
      className="flex shrink-0 items-center gap-1 text-sm text-muted-foreground hover:text-primary"
    >
      <ArrowLeft className="h-4 w-4" />
      Back to Events
    </button>
    <div className="flex min-w-0 flex-1 items-center justify-end gap-1">{children}</div>
  </Body.Header>
)
