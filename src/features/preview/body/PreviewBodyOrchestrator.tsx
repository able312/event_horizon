import { lazy, Suspense } from "react"
import { ErrorBoundary } from "react-error-boundary"
import { useNavigate, useParams, useSearchParams } from "react-router"
import { ArrowLeft, Printer, Save } from "lucide-react"
import { toast } from "sonner"

import { Button } from "~/components/atoms/button"
import { callSavePDF } from "~/lib/ipc/savePDF"
import {
  getPreviewTypeLabel,
  resolvePreviewType,
  type PreviewTypeId,
} from "~/features/preview/lib/previewTypes"

const TimelinePreview = lazy(() => import("~/features/preview/pages/TimelinePreview"))
const EventOverviewPreview = lazy(() =>
  import("~/features/preview/pages/beo/EventOverviewPreview").then((module) => ({
    default: module.EventOverviewPreview,
  })),
)
const FoodOnlyPreview = lazy(() =>
  import("~/features/preview/pages/beo/FoodOnlyPreview").then((module) => ({
    default: module.FoodOnlyPreview,
  })),
)
const FinancialPreview = lazy(() => import("~/features/preview/pages/FinancialPreview"))

function PreviewPageFallback() {
  return (
    <div className="flex items-center justify-center p-8">
      <p className="text-sm text-muted-foreground">Loading preview…</p>
    </div>
  )
}

function renderPreviewPage(type: PreviewTypeId) {
  switch (type) {
    case "timeline":
      return <TimelinePreview />
    case "beo":
      return <EventOverviewPreview />
    case "beo-food":
      return <FoodOnlyPreview />
    case "financial-report":
      return <FinancialPreview />
    default:
      return <EventOverviewPreview />
  }
}

const PreviewBodyOrchestrator: React.FC = () => {
  const navigate = useNavigate()
  const { id: eventId } = useParams()
  const [searchParams] = useSearchParams()
  const previewType = resolvePreviewType(searchParams)

  const handleSavePDF = async () => {
    try {
      const saved = await callSavePDF()
      if (!saved) return

      toast.success("PDF saved")
    } catch (err) {
      toast.error("Failed to save PDF")
      console.error("Failed to save PDF:", err)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-neutral-300 print:bg-white">
      <div className="print:hidden sticky top-0 z-10 flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-1 shadow-sm">
        <Button
          variant="ghost"
          size="sm"
          className="ml-14"
          onClick={() => {
            if (eventId) {
              navigate(`/events/${eventId}`)
              return
            }
            navigate("/events")
          }}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <span className="text-xs font-medium uppercase tracking-wide text-neutral-400">
          Print Preview — {getPreviewTypeLabel(previewType)}
        </span>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => void handleSavePDF()}>
            <Save className="h-4 w-4" />
            Save as PDF
          </Button>
          <Button variant="ghost" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            Print
          </Button>
        </div>
      </div>

      <div className="print:contents flex flex-1 items-start justify-center py-10 print:p-0">
        <div
          className="
            relative min-h-[1056px] w-[816px] bg-white
            p-[0.75in] shadow-[0_4px_32px_rgba(0,0,0,0.18)]
            print:min-h-0 print:w-full print:p-0 print:shadow-none
          "
        >
          <div className="absolute inset-x-0 top-0 h-px bg-neutral-200 print:hidden" />

          <ErrorBoundary
            fallback={
              <div className="p-8 text-sm text-red-500">
                Something went wrong rendering this document.
              </div>
            }
          >
            <Suspense fallback={<PreviewPageFallback />}>
              {renderPreviewPage(previewType)}
            </Suspense>
          </ErrorBoundary>
        </div>
      </div>
    </div>
  )
}

export default PreviewBodyOrchestrator
