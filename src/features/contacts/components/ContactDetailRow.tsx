import { Copy } from "lucide-react"
import { toast } from "sonner"

import { Button } from "~/components/atoms/button"

async function copyToClipboard(text: string, successMessage: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.success(successMessage)
  } catch {
    toast.error("Failed to copy to clipboard")
  }
}

type ContactDetailRowProps = {
  label: string
  value: string | null
}

/** Labelled value with a copy-to-clipboard button; "—" when there's no value. */
export const ContactDetailRow: React.FC<ContactDetailRowProps> = ({ label, value }) => (
  <div className="flex items-center gap-2">
    <dt className="w-12 shrink-0 text-[11px] uppercase tracking-wide text-muted-foreground">{label}</dt>
    <dd className="flex min-w-0 items-center gap-1 text-sm">
      {value ? (
        <>
          <span className="truncate select-text">{value}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-6 text-muted-foreground hover:text-orange-500"
            aria-label={`Copy ${label.toLowerCase()}`}
            onClick={() => void copyToClipboard(value, `${value} copied to clipboard`)}
          >
            <Copy className="size-3" />
          </Button>
        </>
      ) : (
        <span className="text-muted-foreground">—</span>
      )}
    </dd>
  </div>
)
