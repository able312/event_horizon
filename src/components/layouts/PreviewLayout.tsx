import { ErrorBoundary } from "react-error-boundary"
import { Outlet, useLocation, useNavigate } from "react-router"
import { Printer, Save, ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import { Button } from "~/components/atoms/button"
import { callSavePDF } from "~/lib/ipc/savePDF"

export default function PreviewLayout() {
  const navigate = useNavigate()
  const location = useLocation().pathname.split("/")

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
    <div className="w-full min-h-screen flex flex-col bg-neutral-300 print:bg-white">

      {/* Toolbar — hidden when printing */}
      <div className="print:hidden sticky top-0 z-10 flex items-center justify-between px-6 py-1 bg-white border-b border-neutral-200 shadow-sm">
        <Button variant="ghost" size="sm" className="ml-14" onClick={() => navigate('/events/' + location[3])}>
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <span className="text-xs text-neutral-400 font-medium tracking-wide uppercase">
          Print Preview — { location[2] }
        </span>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={ handleSavePDF }>
            <Save className="w-4 h-4" />
            Save as PDF
          </Button>
          <Button variant="ghost" size="sm" onClick={() => window.print()}>
            <Printer className="w-4 h-4" />
            Print
          </Button>
        </div>
      </div>

      {/* Stage — simulates the printer tray */}
      <div className="print:contents flex-1 flex justify-center items-start py-10 print:p-0">
        {/*
          US Letter at 96 dpi = 8.5in × 11in = 816px × 1056px.
          This card is what the printed page will look like exactly.
        */}
        <div
          className="
            relative bg-white
            w-[816px] min-h-[1056px]
            shadow-[0_4px_32px_rgba(0,0,0,0.18)]
            p-[0.75in] print:p-0
            print:shadow-none print:w-full print:min-h-0
           
          "
        >
          {/* Subtle page edge rule — purely decorative, hidden at print */}
          <div className="print:hidden absolute inset-x-0 top-0 h-px bg-neutral-200" />

          <ErrorBoundary fallback={<div className="p-8 text-sm text-red-500">Something went wrong rendering this document.</div>}>
            <Outlet />
          </ErrorBoundary>
        </div>
      </div>
    </div>
  )
}
