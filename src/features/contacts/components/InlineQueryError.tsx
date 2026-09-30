import { Button } from "~/components/atoms/button"
import { cn } from "~/lib/utils"

type InlineQueryErrorProps = {
  message: string
  onRetry: () => void
  isRetrying: boolean
  className?: string
}

/**
 * A failed query shown in place of its content, with a retry.
 * Use instead of defaulting failed data to empty, which reads as "nothing here" when the data may exist.
 */
export const InlineQueryError: React.FC<InlineQueryErrorProps> = ({ message, onRetry, isRetrying, className }) => (
  <div
    role="alert"
    className={cn(
      "flex items-center justify-between gap-2 rounded-lg border border-dashed border-destructive/40 p-3 text-xs",
      className,
    )}
  >
    <p className="text-destructive">{message}</p>
    <Button type="button" variant="ghost" size="sm" className="h-7 shrink-0 text-xs" onClick={onRetry} disabled={isRetrying}>
      {isRetrying ? "Retrying..." : "Retry"}
    </Button>
  </div>
)
