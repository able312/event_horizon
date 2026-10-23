import { ArrowLeft } from "lucide-react"

import { Body } from "~/components/layouts/SplitLayout"

type InboxBodyHeaderProps = {
  onBack: () => void
  /** Set when a request is open in the body */
  requestActions: {
    isReviewing: boolean
    onReview: () => void
    onDismiss: () => void
  } | null
}

const linkClasses = "text-sm font-medium transition-colors"

/** Back to the calendar on the left; Review and Dismiss for the open request on the right. */
const InboxBodyHeader: React.FC<InboxBodyHeaderProps> = ({ onBack, requestActions }) => (
  <Body.Header>
    <button
      type="button"
      onClick={onBack}
      className="flex shrink-0 items-center gap-1 text-sm text-muted-foreground hover:text-primary"
    >
      <ArrowLeft className="h-4 w-4" />
      Back to Calendar
    </button>
    {requestActions ? (
      <div className="flex items-center gap-3 pr-4">
        {requestActions.isReviewing ? (
          <span className={`${linkClasses} text-muted-foreground`}>Reviewing</span>
        ) : (
          <button type="button" onClick={requestActions.onReview} className={`${linkClasses} text-orange-600 hover:text-orange-500`}>
            Review
          </button>
        )}
        <span aria-hidden="true" className="text-muted-foreground">·</span>
        <button
          type="button"
          onClick={requestActions.onDismiss}
          className={`${linkClasses} text-muted-foreground hover:text-destructive`}
        >
          Dismiss
        </button>
      </div>
    ) : null}
  </Body.Header>
)

export default InboxBodyHeader
