import React from "react"
import { AlertCircle, CheckCircle2, Circle, Copy, Plus } from "lucide-react"

import { Button } from "~/components/atoms/button"

// NOTE: This is a static UI/UX scaffold. All content is hard-coded demo data.

const OverviewWorkspaceSection: React.FC = () => {
  return (
    <div className="space-y-4">

      <div className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="min-w-0 space-y-4">
          <EventDescriptionCard />
          <DeadlinesCard />
        </div>

        <div className="min-w-0 space-y-4">
          <ClientCard />
          <InternalNotesCard />
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Event Description card                                              */
/* ------------------------------------------------------------------ */

const EventDescriptionCard: React.FC = () => (
  <section className="rounded-xs border border-border bg-background p-3 shadow-sm">
    <div className="border-b border-border pb-2">
      <h3 className="text-sm font-semibold tracking-wide">Event Description</h3>
      <p className="text-xs text-muted-foreground">
        A short summary of the event, visible on client-facing documents.
      </p>
    </div>
    <textarea
      rows={5}
      defaultValue={
        "Evening wedding reception for Jordan & Casey. Ceremony off-site at 3:30 PM, "
        + "guests arriving at the clubhouse for 5:00 PM cocktails on the patio, followed "
        + "by a plated dinner in the main hall and dancing until midnight. Head table of "
        + "10, sweetheart backdrop provided by the couple's decorator."
      }
      aria-label="Event Description"
      className="mt-2 w-full resize-none rounded-xs border border-transparent bg-transparent px-1.5 py-1 text-sm leading-relaxed outline-none transition-colors focus:border-border focus:bg-background"
    />
  </section>
)

/* ------------------------------------------------------------------ */
/* Deadlines card                                                      */
/* ------------------------------------------------------------------ */

type DeadlineStatus = "done" | "upcoming" | "overdue"

interface DemoDeadline {
  label: string
  timing: string
  status: DeadlineStatus
}

const DEMO_DEADLINES: DemoDeadline[] = [
  { label: "Confirm booking", timing: "18 days before event · Aug 4", status: "done" },
  { label: "Send estimate for approval", timing: "16 days before event · Aug 6", status: "overdue" },
  { label: "Confirm menu choices & dietary restrictions", timing: "14 days before event · Aug 8", status: "upcoming" },
  { label: "Final guest count", timing: "7 days before event · Aug 15", status: "upcoming" },
  { label: "Final payment due", timing: "3 days before event · Aug 19", status: "upcoming" },
]

const DeadlinesCard: React.FC = () => (
  <section className="rounded-xs border border-border bg-background p-3 shadow-sm">
    <div className="flex items-center justify-between border-b border-border pb-2">
      <div>
        <h3 className="text-sm font-semibold tracking-wide">Deadlines</h3>
        <p className="text-xs text-muted-foreground">Key dates leading up to the event.</p>
      </div>
      <button
        type="button"
        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
      >
        <Plus size={14} />
        Add Deadline
      </button>
    </div>

    <ul className="mt-1 divide-y divide-border">
      {DEMO_DEADLINES.map((deadline) => (
        <DeadlineRow key={deadline.label} deadline={deadline} />
      ))}
    </ul>
  </section>
)

const DeadlineRow: React.FC<{ deadline: DemoDeadline }> = ({ deadline }) => {
  const icon = deadline.status === "done"
    ? <CheckCircle2 size={16} className="shrink-0 text-muted-foreground" />
    : deadline.status === "overdue"
      ? <AlertCircle size={16} className="shrink-0 text-destructive" />
      : <Circle size={16} className="shrink-0 text-orange-500" />

  return (
    <li className="flex items-center gap-3 py-2.5">
      {icon}
      <div className="min-w-0 flex-1">
        <p className={deadline.status === "done"
          ? "text-sm font-medium text-muted-foreground line-through"
          : "text-sm font-medium"}
        >
          {deadline.label}
        </p>
        <p className="text-xs text-muted-foreground">{deadline.timing}</p>
      </div>
      {deadline.status === "overdue" ? (
        <span className="rounded-xs bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
          Overdue
        </span>
      ) : null}
    </li>
  )
}

/* ------------------------------------------------------------------ */
/* Client card                                                         */
/* ------------------------------------------------------------------ */

const ClientCard: React.FC = () => (
  <section className="rounded-xs border border-border bg-background p-3 shadow-sm">
    <div className="border-b border-border pb-2">
      <h3 className="text-sm font-semibold tracking-wide">Client</h3>
      <p className="text-xs text-muted-foreground">Primary contact for this event.</p>
    </div>

    <div className="mt-2 space-y-3">
      <ClientField label="Name" value="Jordan Macdonald" />
      <ClientField label="Email" value="jordan.macdonald@example.com" />
      <ClientField label="Phone" value="(902) 555-0142" />
      <ClientField label="Preferred Contact" value="Email" />
    </div>

    <div className="mt-3 border-t border-border pt-3">
      <Button type="button" variant="outline" size="sm">
        <Copy />
        Copy Email
      </Button>
    </div>
  </section>
)

interface ClientFieldProps {
  label: string
  value: string
}

const ClientField: React.FC<ClientFieldProps> = ({ label, value }) => (
  <div>
    <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
    <p className="text-sm font-medium">{value}</p>
  </div>
)

/* ------------------------------------------------------------------ */
/* Internal Notes card                                                 */
/* ------------------------------------------------------------------ */

const InternalNotesCard: React.FC = () => (
  <section className="rounded-xs border border-border bg-background p-3 shadow-sm">
    <div className="border-b border-border pb-2">
      <h3 className="text-sm font-semibold tracking-wide">Internal Notes</h3>
      <p className="text-xs text-muted-foreground">Only visible to staff.</p>
    </div>
    <textarea
      rows={4}
      defaultValue={
        "Client prefers texts over calls after 5 PM. Decorator needs hall access by "
        + "10 AM day-of. Watch the bar tab limit — cash bar after $2,500."
      }
      aria-label="Internal Notes"
      className="mt-2 w-full resize-none rounded-xs border border-transparent bg-transparent px-1.5 py-1 text-sm leading-relaxed outline-none transition-colors focus:border-border focus:bg-background"
    />
  </section>
)

export default OverviewWorkspaceSection
