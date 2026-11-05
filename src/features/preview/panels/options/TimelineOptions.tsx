import {
  PreviewOptionSection,
  PreviewToggleRow,
} from "~/features/preview/panels/PreviewOptionControls"
import { usePreviewPreferences } from "~/features/preview/preferences/PreviewPreferencesContext"
import { hasInternalNotes, hasKitchenNotes } from "~/features/preview/preferences/selectors"
import { useEvent } from "~/hooks/useEvent"
import { useFoodSection } from "~/hooks/useFoodSection"

export function TimelineOptions() {
  const { state, dispatch } = usePreviewPreferences()
  const prefs = state.timeline
  const { data: event } = useEvent()
  const { data: food } = useFoodSection()

  return (
    <PreviewOptionSection title="Options">
      {hasInternalNotes(event) ? (
        <PreviewToggleRow
          id="timeline-internal-notes"
          label="Internal notes"
          checked={prefs.showInternalNotes}
          onChange={(value) => dispatch({ type: "timeline/setShowInternalNotes", value })}
        />
      ) : null}
      {hasKitchenNotes(food) ? (
        <PreviewToggleRow
          id="timeline-kitchen-notes"
          label="Kitchen notes"
          checked={prefs.showKitchenNotes}
          onChange={(value) => dispatch({ type: "timeline/setShowKitchenNotes", value })}
        />
      ) : null}
      <PreviewToggleRow
        id="timeline-system-rows"
        label="Include system rows"
        checked={prefs.includeSystemRows}
        onChange={(value) => dispatch({ type: "timeline/setIncludeSystemRows", value })}
      />
    </PreviewOptionSection>
  )
}
