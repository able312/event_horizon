import { useEffect } from "react"

import { useBeverageSection } from "~/hooks/useBeverageSection"
import { useEvent } from "~/hooks/useEvent"
import { useFoodSection } from "~/hooks/useFoodSection"
import { useNoteSection } from "~/hooks/useNoteSection"
import { usePaymentsSection } from "~/hooks/usePaymentsSection"
import { useSetupInstructionSection } from "~/hooks/useSetupInstrucionSection"
import { usePreviewPreferences } from "~/features/preview/preferences/PreviewPreferencesContext"
import {
  BEO_TIMEBLOCK_SECTION_IDS,
  type BeoTimeblockSectionId,
} from "~/features/preview/preferences/types"

/**
 * Applies one-time data-derived defaults after query data first arrives.
 * Later refreshes do not overwrite user choices.
 */
export function usePreviewPreferenceDefaults() {
  const { state, dispatch } = usePreviewPreferences()
  const { data: event } = useEvent()
  const { data: food } = useFoodSection()
  const { timeblocks: beverageTimeblocks, data: beverageData } = useBeverageSection()
  const { data: setup } = useSetupInstructionSection()
  const { data: notes } = useNoteSection()
  const { data: payments } = usePaymentsSection()

  useEffect(() => {
    // undefined means the section has not loaded (or failed); apply each section as soon as it arrives.
    const loaded: Record<BeoTimeblockSectionId, { id: string }[] | undefined> = {
      food,
      beverage: beverageData === undefined ? undefined : beverageTimeblocks,
      setup,
      notes,
    }
    for (const section of BEO_TIMEBLOCK_SECTION_IDS) {
      const timeblocks = loaded[section]
      if (state.defaultsApplied.beoTimeblocks[section] || timeblocks === undefined) continue
      dispatch({
        type: "beo/applyDefaultTimeblocks",
        section,
        ids: timeblocks.map((tb) => tb.id),
      })
    }
  }, [
    beverageTimeblocks,
    beverageData,
    dispatch,
    food,
    notes,
    setup,
    state.defaultsApplied.beoTimeblocks,
  ])

  useEffect(() => {
    if (state.defaultsApplied.foodBeoTimeblocks) return
    if (!food) return

    dispatch({
      type: "beo-food/applyDefaultTimeblocks",
      ids: food.map((tb) => tb.id),
    })
  }, [dispatch, food, state.defaultsApplied.foodBeoTimeblocks])

  useEffect(() => {
    if (state.defaultsApplied.financialPayments) return
    if (payments === undefined) return

    dispatch({
      type: "financial/applyPaymentDefault",
      hasPayments: payments.length > 0,
    })
  }, [dispatch, payments, state.defaultsApplied.financialPayments])

  // Touch event so the hook stays event-scoped without unused-var noise if unused.
  void event
}
