import { useParams, useSearchParams } from "react-router"

import { Panel } from "~/components/layouts/SplitLayout"
import { useBeverageSection } from "~/hooks/useBeverageSection"
import { useEvent } from "~/hooks/useEvent"
import { useFoodSection } from "~/hooks/useFoodSection"
import { useNoteSection } from "~/hooks/useNoteSection"
import { usePaymentsSection } from "~/hooks/usePaymentsSection"
import { useSetupInstructionSection } from "~/hooks/useSetupInstrucionSection"
import { useVendorSection } from "~/hooks/useVendorSection"
import {
  PREVIEW_TYPES,
  resolvePreviewType,
} from "~/features/preview/lib/previewTypes"
import {
  PreviewOptionSection,
  PreviewTimeblockSelector,
  PreviewToggleRow,
} from "~/features/preview/panels/PreviewOptionControls"
import { usePreviewPreferences } from "~/features/preview/preferences/PreviewPreferencesContext"
import { usePreviewPreferenceDefaults } from "~/features/preview/preferences/usePreviewPreferenceDefaults"
import {
  filterSelectedIds,
  hasBeverageNotes,
  hasBeverageSectionContent,
  hasContactInfo,
  hasInternalNotes,
  hasPricedFoodOrBeverage,
  toTimeblockOptions,
} from "~/features/preview/preferences/selectors"
import { formatDate } from "~/lib/formatters"
import { cn } from "~/lib/utils"

const PreviewPanelOrchestrator: React.FC = () => {
  const { id: eventId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const { data: event } = useEvent()
  const activeType = resolvePreviewType(searchParams)
  const { state, dispatch } = usePreviewPreferences()

  usePreviewPreferenceDefaults()

  const { data: food } = useFoodSection()
  const { timeblocks: beverageTimeblocks, items: beverageItems } = useBeverageSection()
  const { data: vendors } = useVendorSection()
  const { data: setup } = useSetupInstructionSection()
  const { data: notes } = useNoteSection()
  const { data: payments } = usePaymentsSection()

  const foodOptions = toTimeblockOptions(food)
  const beverageOptions = toTimeblockOptions(beverageTimeblocks)
  const vendorOptions = toTimeblockOptions(vendors)
  const setupOptions = toTimeblockOptions(setup)
  const noteOptions = toTimeblockOptions(notes)

  const showContactControl = hasContactInfo(event)
  const showInternalNotesControl = hasInternalNotes(event)
  const showPricingControl = hasPricedFoodOrBeverage({
    foodTimeblocks: food,
    beverageItems,
  })
  const isTournament = event?.type === "tournament"
  const beverageSectionAvailable = hasBeverageSectionContent({
    timeblocks: beverageTimeblocks,
    items: beverageItems,
  })
  const beverageNotesAvailable = hasBeverageNotes(beverageItems)
  const paymentsExist = (payments?.length ?? 0) > 0

  const beoFoodSelected = filterSelectedIds(
    state.beo.selectedTimeblockIds.food,
    foodOptions.map((o) => o.id),
  )
  const beoBeverageSelected = filterSelectedIds(
    state.beo.selectedTimeblockIds.beverage,
    beverageOptions.map((o) => o.id),
  )
  const beoVendorSelected = filterSelectedIds(
    state.beo.selectedTimeblockIds.vendors,
    vendorOptions.map((o) => o.id),
  )
  const beoSetupSelected = filterSelectedIds(
    state.beo.selectedTimeblockIds.setup,
    setupOptions.map((o) => o.id),
  )
  const beoNoteSelected = filterSelectedIds(
    state.beo.selectedTimeblockIds.notes,
    noteOptions.map((o) => o.id),
  )
  const foodBeoSelected = filterSelectedIds(
    state["beo-food"].selectedFoodTimeblockIds,
    foodOptions.map((o) => o.id),
  )

  const handleSelectType = (typeId: (typeof PREVIEW_TYPES)[number]["id"]) => {
    if (!eventId) return

    const nextParams = new URLSearchParams(searchParams)
    nextParams.set("type", typeId)
    setSearchParams(nextParams, { replace: true })
  }

  return (
    <>
      <Panel.Header>
        <div className="flex w-full min-w-0 flex-col gap-0.5 px-1 py-1">
          <p className="truncate text-sm font-semibold text-stone-100">
            {event?.title ?? "Preview"}
          </p>
          {event?.startDateTime ? (
            <p className="truncate text-xs text-stone-400">
              {formatDate(event.startDateTime)}
            </p>
          ) : (
            <p className="text-xs text-stone-500">No event date set</p>
          )}
        </div>
      </Panel.Header>

      <Panel.Content>
        <div className="space-y-6 px-3 py-4">
          <PreviewOptionSection title="Preview Type">
            <div className="space-y-1">
              {PREVIEW_TYPES.map(({ id, label, icon: Icon }) => {
                const isActive = activeType === id

                return (
                  <button
                    key={id}
                    type="button"
                    aria-current={isActive ? "page" : undefined}
                    onClick={() => handleSelectType(id)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors",
                      isActive
                        ? "bg-white/10 text-stone-100"
                        : "text-stone-300 hover:bg-white/5 hover:text-stone-100",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{label}</span>
                  </button>
                )
              })}
            </div>
          </PreviewOptionSection>

          {activeType === "beo" ? (
            <PreviewOptionSection title="Options">
              {showContactControl ? (
                <PreviewToggleRow
                  id="beo-contact"
                  label="Contact information"
                  checked={state.beo.showContactInfo}
                  onChange={(value) => dispatch({ type: "beo/setShowContactInfo", value })}
                />
              ) : null}
              {showInternalNotesControl ? (
                <PreviewToggleRow
                  id="beo-internal-notes"
                  label="Internal notes"
                  checked={state.beo.showInternalNotes}
                  onChange={(value) => dispatch({ type: "beo/setShowInternalNotes", value })}
                />
              ) : null}
              {showPricingControl ? (
                <PreviewToggleRow
                  id="beo-pricing"
                  label="Show pricing"
                  checked={state.beo.showPricing}
                  onChange={(value) => dispatch({ type: "beo/setShowPricing", value })}
                />
              ) : null}

              {(vendors?.length ?? 0) > 0 ? (
                <PreviewToggleRow
                  id="beo-section-vendors"
                  label="Vendors"
                  checked={state.beo.sections.vendors}
                  onChange={(value) =>
                    dispatch({ type: "beo/setSectionVisible", section: "vendors", value })
                  }
                />
              ) : null}
              {isTournament ? (
                <>
                  <PreviewToggleRow
                    id="beo-section-tournament"
                    label="Tournament details"
                    checked={state.beo.sections.tournament}
                    onChange={(value) =>
                      dispatch({ type: "beo/setSectionVisible", section: "tournament", value })
                    }
                  />
                  <PreviewToggleRow
                    id="beo-section-cart"
                    label="Cart details"
                    checked={state.beo.sections.cart}
                    onChange={(value) =>
                      dispatch({ type: "beo/setSectionVisible", section: "cart", value })
                    }
                  />
                </>
              ) : null}
              {(food?.length ?? 0) > 0 ? (
                <PreviewToggleRow
                  id="beo-section-food"
                  label="Food"
                  checked={state.beo.sections.food}
                  onChange={(value) =>
                    dispatch({ type: "beo/setSectionVisible", section: "food", value })
                  }
                />
              ) : null}
              {beverageSectionAvailable ? (
                <PreviewToggleRow
                  id="beo-section-beverage"
                  label="Beverage"
                  checked={state.beo.sections.beverage}
                  onChange={(value) =>
                    dispatch({ type: "beo/setSectionVisible", section: "beverage", value })
                  }
                />
              ) : null}
              {(setup?.length ?? 0) > 0 ? (
                <PreviewToggleRow
                  id="beo-section-setup"
                  label="Setup instructions"
                  checked={state.beo.sections.setup}
                  onChange={(value) =>
                    dispatch({ type: "beo/setSectionVisible", section: "setup", value })
                  }
                />
              ) : null}
              {(notes?.length ?? 0) > 0 ? (
                <PreviewToggleRow
                  id="beo-section-notes"
                  label="Notes"
                  checked={state.beo.sections.notes}
                  onChange={(value) =>
                    dispatch({ type: "beo/setSectionVisible", section: "notes", value })
                  }
                />
              ) : null}

              {state.beo.sections.food ? (
                <PreviewTimeblockSelector
                  sectionLabel="Food timeblocks"
                  options={foodOptions}
                  selectedIds={beoFoodSelected}
                  onToggle={(id, value) =>
                    dispatch({ type: "beo/setTimeblockSelected", section: "food", id, value })
                  }
                  onSelectAll={() =>
                    dispatch({
                      type: "beo/selectAllTimeblocks",
                      section: "food",
                      ids: foodOptions.map((o) => o.id),
                    })
                  }
                  onClearAll={() =>
                    dispatch({ type: "beo/clearAllTimeblocks", section: "food" })
                  }
                />
              ) : null}
              {state.beo.sections.beverage ? (
                <PreviewTimeblockSelector
                  sectionLabel="Beverage timeblocks"
                  options={beverageOptions}
                  selectedIds={beoBeverageSelected}
                  onToggle={(id, value) =>
                    dispatch({ type: "beo/setTimeblockSelected", section: "beverage", id, value })
                  }
                  onSelectAll={() =>
                    dispatch({
                      type: "beo/selectAllTimeblocks",
                      section: "beverage",
                      ids: beverageOptions.map((o) => o.id),
                    })
                  }
                  onClearAll={() =>
                    dispatch({ type: "beo/clearAllTimeblocks", section: "beverage" })
                  }
                />
              ) : null}
              {state.beo.sections.vendors ? (
                <PreviewTimeblockSelector
                  sectionLabel="Vendor timeblocks"
                  options={vendorOptions}
                  selectedIds={beoVendorSelected}
                  onToggle={(id, value) =>
                    dispatch({ type: "beo/setTimeblockSelected", section: "vendors", id, value })
                  }
                  onSelectAll={() =>
                    dispatch({
                      type: "beo/selectAllTimeblocks",
                      section: "vendors",
                      ids: vendorOptions.map((o) => o.id),
                    })
                  }
                  onClearAll={() =>
                    dispatch({ type: "beo/clearAllTimeblocks", section: "vendors" })
                  }
                />
              ) : null}
              {state.beo.sections.setup ? (
                <PreviewTimeblockSelector
                  sectionLabel="Setup timeblocks"
                  options={setupOptions}
                  selectedIds={beoSetupSelected}
                  onToggle={(id, value) =>
                    dispatch({ type: "beo/setTimeblockSelected", section: "setup", id, value })
                  }
                  onSelectAll={() =>
                    dispatch({
                      type: "beo/selectAllTimeblocks",
                      section: "setup",
                      ids: setupOptions.map((o) => o.id),
                    })
                  }
                  onClearAll={() =>
                    dispatch({ type: "beo/clearAllTimeblocks", section: "setup" })
                  }
                />
              ) : null}
              {state.beo.sections.notes ? (
                <PreviewTimeblockSelector
                  sectionLabel="Note timeblocks"
                  options={noteOptions}
                  selectedIds={beoNoteSelected}
                  onToggle={(id, value) =>
                    dispatch({ type: "beo/setTimeblockSelected", section: "notes", id, value })
                  }
                  onSelectAll={() =>
                    dispatch({
                      type: "beo/selectAllTimeblocks",
                      section: "notes",
                      ids: noteOptions.map((o) => o.id),
                    })
                  }
                  onClearAll={() =>
                    dispatch({ type: "beo/clearAllTimeblocks", section: "notes" })
                  }
                />
              ) : null}
            </PreviewOptionSection>
          ) : null}

          {activeType === "beo-food" ? (
            <PreviewOptionSection title="Options">
              {showContactControl ? (
                <PreviewToggleRow
                  id="food-beo-contact"
                  label="Contact information"
                  checked={state["beo-food"].showContactInfo}
                  onChange={(value) =>
                    dispatch({ type: "beo-food/setShowContactInfo", value })
                  }
                />
              ) : null}
              {showInternalNotesControl ? (
                <PreviewToggleRow
                  id="food-beo-internal-notes"
                  label="Internal notes"
                  checked={state["beo-food"].showInternalNotes}
                  onChange={(value) =>
                    dispatch({ type: "beo-food/setShowInternalNotes", value })
                  }
                />
              ) : null}
              {showPricingControl ? (
                <PreviewToggleRow
                  id="food-beo-pricing"
                  label="Show pricing"
                  checked={state["beo-food"].showPricing}
                  onChange={(value) => dispatch({ type: "beo-food/setShowPricing", value })}
                />
              ) : null}
              <PreviewTimeblockSelector
                sectionLabel="Food timeblocks"
                options={foodOptions}
                selectedIds={foodBeoSelected}
                onToggle={(id, value) =>
                  dispatch({ type: "beo-food/setTimeblockSelected", id, value })
                }
                onSelectAll={() =>
                  dispatch({
                    type: "beo-food/selectAllTimeblocks",
                    ids: foodOptions.map((o) => o.id),
                  })
                }
                onClearAll={() => dispatch({ type: "beo-food/clearAllTimeblocks" })}
              />
            </PreviewOptionSection>
          ) : null}

          {activeType === "timeline" ? (
            <PreviewOptionSection title="Options">
              {showInternalNotesControl ? (
                <PreviewToggleRow
                  id="timeline-internal-notes"
                  label="Internal notes"
                  checked={state.timeline.showInternalNotes}
                  onChange={(value) =>
                    dispatch({ type: "timeline/setShowInternalNotes", value })
                  }
                />
              ) : null}
              <PreviewToggleRow
                id="timeline-system-rows"
                label="Include system rows"
                checked={state.timeline.includeSystemRows}
                onChange={(value) =>
                  dispatch({ type: "timeline/setIncludeSystemRows", value })
                }
              />
            </PreviewOptionSection>
          ) : null}

          {activeType === "financial-report" ? (
            <PreviewOptionSection title="Options">
              {(beverageItems?.length ?? 0) > 0 ? (
                <PreviewToggleRow
                  id="financial-beverage-appendix"
                  label="Show beverage list"
                  checked={state["financial-report"].showBeverageAppendix}
                  onChange={(value) =>
                    dispatch({ type: "financial/setShowBeverageAppendix", value })
                  }
                />
              ) : null}
              {state["financial-report"].showBeverageAppendix && beverageNotesAvailable ? (
                <PreviewToggleRow
                  id="financial-beverage-notes"
                  label="Beverage notes"
                  checked={state["financial-report"].showBeverageNotes}
                  onChange={(value) =>
                    dispatch({ type: "financial/setShowBeverageNotes", value })
                  }
                />
              ) : null}
              <PreviewToggleRow
                id="financial-charge-breakdown"
                label="Charge breakdown"
                checked={state["financial-report"].showChargeBreakdown}
                onChange={(value) =>
                  dispatch({ type: "financial/setShowChargeBreakdown", value })
                }
              />
              {paymentsExist ? (
                <PreviewToggleRow
                  id="financial-payment-status"
                  label="Payment status"
                  checked={state["financial-report"].showPaymentStatus}
                  onChange={(value) =>
                    dispatch({ type: "financial/setShowPaymentStatus", value })
                  }
                />
              ) : null}
            </PreviewOptionSection>
          ) : null}
        </div>
      </Panel.Content>
    </>
  )
}

export default PreviewPanelOrchestrator
