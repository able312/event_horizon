import { useEffect } from "react"

import { useBeverageSection } from "~/hooks/useBeverageSection"
import { useEvent } from "~/hooks/useEvent"
import { useFoodSection } from "~/hooks/useFoodSection"
import { useNoteSection } from "~/hooks/useNoteSection"
import { usePaymentsSection } from "~/hooks/usePaymentsSection"
import { useSetupInstructionSection } from "~/hooks/useSetupInstrucionSection"
import { usePreviewPreferences } from "~/features/preview/preferences/PreviewPreferencesContext"

/**
 * Applies one-time data-derived defaults after query data first arrives.
 * Later refreshes do not overwrite user choices.
 */
export function usePreviewPreferenceDefaults() {
  const { state, dispatch } = usePreviewPreferences()
  const { data: event } = useEvent()
  const { data: food } = useFoodSection()
  const { timeblocks: beverageTimeblocks } = useBeverageSection()
  const { data: setup } = useSetupInstructionSection()
  const { data: notes } = useNoteSection()
  const { data: payments } = usePaymentsSection()

  useEffect(() => {
    if (state.defaultsApplied.beoTimeblocks) return
    if (!food && !beverageTimeblocks && !setup && !notes) return

    dispatch({
      type: "beo/applyDefaultTimeblocks",
      selections: {
        food: (food ?? []).map((tb) => tb.id),
        beverage: beverageTimeblocks.map((tb) => tb.id),
        setup: (setup ?? []).map((tb) => tb.id),
        notes: (notes ?? []).map((tb) => tb.id),
      },
    })
  }, [
    beverageTimeblocks,
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
