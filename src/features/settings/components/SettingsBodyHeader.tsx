import { ArrowLeft } from "lucide-react"

import { Body } from "~/components/layouts/SplitLayout"

type SettingsBodyHeaderProps = {
  title: string
  onBack: () => void
}

export const SettingsBodyHeader: React.FC<SettingsBodyHeaderProps> = ({ title, onBack }) => (
  <Body.Header>
    <button
      type="button"
      onClick={onBack}
      className="flex shrink-0 items-center gap-1 text-sm text-muted-foreground hover:text-primary"
    >
      <ArrowLeft className="h-4 w-4" />
      Back to Events
    </button>
    <h1 className="ml-4 mr-auto truncate text-sm font-semibold tracking-wide">{title}</h1>
  </Body.Header>
)
