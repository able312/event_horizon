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
  /** Set when an event update is open in the body; onOpenEvent is null once the event is deleted */
  notificationActions: {
    onOpenEvent: (() => void) | null
    onDismiss: () => void
  } | null
}

const linkClasses = "text-sm font-medium transition-colors"

const Separator: React.FC = () => <span aria-hidden="true" className="text-muted-foreground">·</span>

const DismissButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button type="button" onClick={onClick} className={`${linkClasses} text-muted-foreground hover:text-destructive`}>
    Dismiss
  </button>
)

/** Back to the calendar on the left; actions for the open request or update on the right. */
const InboxBodyHeader: React.FC<InboxBodyHeaderProps> = ({ onBack, requestActions, notificationActions }) => (
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
        <Separator />
        <DismissButton onClick={requestActions.onDismiss} />
      </div>
    ) : notificationActions ? (
      <div className="flex items-center gap-3 pr-4">
        {notificationActions.onOpenEvent ? (
          <>
            <button type="button" onClick={notificationActions.onOpenEvent} className={`${linkClasses} text-orange-600 hover:text-orange-500`}>
              Open event
            </button>
            <Separator />
          </>
        ) : null}
        <DismissButton onClick={notificationActions.onDismiss} />
      </div>
    ) : null}
  </Body.Header>
)

export default InboxBodyHeader
