import { useMemo } from "react"

import { useEvent } from "~/hooks/useEvent"
import { useTimeline } from "~/hooks/useTimeline"
import { useFoodSection } from "~/hooks/useFoodSection"
import { useBeverageSection } from "~/hooks/useBeverageSection"
import { useVendorSection } from "~/hooks/useVendorSection"
import { useNoteSection } from "~/hooks/useNoteSection"
import { useSetupInstructionSection } from "~/hooks/useSetupInstrucionSection"

import { buildWorkspaceNav } from "../lib/buildWorkspaceNav"
import type { EventWorkspaceData } from "../types"

export function useEventWorkspaceData(): EventWorkspaceData {
  const eventQuery = useEvent()
  const timelineQuery = useTimeline()
  const foodQuery = useFoodSection()
  const beverageQuery = useBeverageSection()
  const vendorQuery = useVendorSection()
  const noteQuery = useNoteSection()
  const setupQuery = useSetupInstructionSection()

  const sectionRows = useMemo(
    () => [
      ...(foodQuery.data ?? []),
      ...(beverageQuery.timeblocks ?? []),
      ...(vendorQuery.data ?? []),
      ...(noteQuery.data ?? []),
      ...(setupQuery.data ?? []),
    ],
    [foodQuery.data, beverageQuery.timeblocks, vendorQuery.data, noteQuery.data, setupQuery.data],
  )

  const navModel = useMemo(
    () =>
      buildWorkspaceNav({
        event: eventQuery.data,
        timelineRows: timelineQuery.data ?? [],
        sectionRows,
      }),
    [eventQuery.data, timelineQuery.data, sectionRows],
  )

  const isLoading =
    eventQuery.isLoading ||
    timelineQuery.isLoading ||
    foodQuery.isLoading ||
    beverageQuery.isLoading ||
    vendorQuery.isLoading ||
    noteQuery.isLoading ||
    setupQuery.isLoading

  const isFetching =
    eventQuery.isFetching ||
    timelineQuery.isFetching ||
    foodQuery.isFetching ||
    beverageQuery.isFetching ||
    vendorQuery.isFetching ||
    noteQuery.isFetching ||
    setupQuery.isFetching

  const error =
    (eventQuery.error as Error | null) ||
    (timelineQuery.error as Error | null) ||
    (foodQuery.error as Error | null) ||
    (beverageQuery.error as Error | null) ||
    (vendorQuery.error as Error | null) ||
    (noteQuery.error as Error | null) ||
    (setupQuery.error as Error | null) ||
    null

  const refetchAll = async () => {
    await Promise.all([
      eventQuery.refetch(),
      timelineQuery.refetch(),
      foodQuery.refetch(),
      beverageQuery.refetch(),
      vendorQuery.refetch(),
      noteQuery.refetch(),
      setupQuery.refetch(),
    ])
  }

  return {
    event: eventQuery.data,
    isLoading,
    isFetching,
    error,
    updateEvent: eventQuery.updateEvent,
    deleteEvent: eventQuery.deleteEvent,
    timelineRows: timelineQuery.data ?? [],
    sectionRows,
    navModel,
    refetchAll,
  }
}
