import { useCallback } from "react"
import { useLocation, useNavigate } from "react-router"

import { buildPreviewPath, type PreviewTypeId } from "~/features/preview/lib/previewTypes"

/** Opens one of the event's previews, returning to the current workspace view afterwards. */
export function useOpenPreview(eventId: string) {
  const navigate = useNavigate()
  const location = useLocation()
  const returnTo = `${location.pathname}${location.search}${location.hash}`

  return useCallback(
    (type: PreviewTypeId) => {
      if (!eventId) return
      navigate(buildPreviewPath(eventId, type, returnTo))
    },
    [eventId, navigate, returnTo],
  )
}
