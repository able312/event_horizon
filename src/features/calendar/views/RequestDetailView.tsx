import type { ReactNode } from "react"

import type { EventRequest } from "~/definitions/database"
import { EVENT_TYPE_COLORS, EVENT_TYPE_LABELS } from "~/definitions/events/ui"
import { ContactSectionCard } from "~/features/contacts-directory/components/ContactSectionCard"
import { formatRequestDate, formatRequestTime, requestClientName, requestTitle } from "~/features/calendar/lib/eventRequestPrefill"

type RequestDetailViewProps = {
  request: EventRequest
}

type FieldProps = {
  label: string
  children: ReactNode
}

const Field: React.FC<FieldProps> = ({ label, children }) => (
  <div className="grid grid-cols-[8rem_1fr] gap-3">
    <dt className="pt-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">{label}</dt>
    <dd className="min-w-0 text-sm select-text">{children ?? <span className="text-muted-foreground">—</span>}</dd>
  </div>
)

function formatSubmitted(iso: string): string {
  const date = new Date(iso)
  return `${date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })} at ${date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`
}

/** Everything the client sent with a website request, as they sent it. */
const RequestDetailView: React.FC<RequestDetailViewProps> = ({ request }) => {
  const otherAnswers = [
    ...(request.referralSource ? [{ question: "How did you hear about us?", answer: request.referralSource }] : []),
    ...request.extraAnswers,
  ]

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 overflow-y-auto p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight select-text">{requestTitle(request)}</h1>
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span className={`rounded px-2 py-0.5 text-xs ${EVENT_TYPE_COLORS[request.eventType]}`}>
            {EVENT_TYPE_LABELS[request.eventType]}
          </span>
          <span>Website request · submitted {formatSubmitted(request.submittedAt)}</span>
        </div>
        {request.eventName ? null : (
          <p className="mt-1 text-xs text-muted-foreground">The client didn&apos;t name the event; this title is a suggestion.</p>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ContactSectionCard title="Event">
          <dl className="space-y-2">
            <Field label="Preferred date">{request.preferredDate ? formatRequestDate(request.preferredDate) : null}</Field>
            <Field label="Alternate date">{request.alternateDate ? formatRequestDate(request.alternateDate) : null}</Field>
            <Field label="Start time">{request.startTime ? formatRequestTime(request.startTime) : null}</Field>
            <Field label="Guests">{request.guestCount}</Field>
          </dl>
        </ContactSectionCard>

        <ContactSectionCard title="Client">
          <dl className="space-y-2">
            <Field label="Name">{requestClientName(request)}</Field>
            <Field label="Organization">{request.organizationName}</Field>
            <Field label="Email">{request.email}</Field>
            <Field label="Phone">{request.phone}</Field>
          </dl>
        </ContactSectionCard>
      </div>

      <ContactSectionCard title="About the event">
        {request.details ? (
          <p className="whitespace-pre-wrap text-sm select-text">{request.details}</p>
        ) : (
          <p className="text-sm text-muted-foreground">No description given.</p>
        )}
      </ContactSectionCard>

      {otherAnswers.length > 0 ? (
        <ContactSectionCard title="Other answers">
          <dl className="space-y-3">
            {otherAnswers.map(({ question, answer }) => (
              <div key={question}>
                <dt className="text-xs text-muted-foreground">{question}</dt>
                <dd className="whitespace-pre-wrap text-sm select-text">{answer}</dd>
              </div>
            ))}
          </dl>
        </ContactSectionCard>
      ) : null}
    </div>
  )
}

export default RequestDetailView
