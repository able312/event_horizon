import { createContext, useContext, useLayoutEffect } from "react"

export const PreviewReadinessContext = createContext<((ready: boolean) => void) | null>(null)

/** Share export readiness without coupling layouts to the toolbar. */
export function useReportPreviewReadiness(ready: boolean) {
  const report = useContext(PreviewReadinessContext)
  useLayoutEffect(() => {
    report?.(ready)
    return () => report?.(false)
  }, [ready, report])
}
