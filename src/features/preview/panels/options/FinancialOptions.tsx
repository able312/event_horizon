import { isAddOn } from "~/features/event-detail/workspace/lib/estimateAddOns"
import { FOOD_PACKAGE_ESTIMATE_MODE_OPTIONS } from "~/features/preview/lib/foodPackages"
import {
  PreviewOptionSection,
  PreviewRadioRow,
  PreviewTimeblockSelector,
  PreviewToggleRow,
} from "~/features/preview/panels/PreviewOptionControls"
import { usePreviewPreferences } from "~/features/preview/preferences/PreviewPreferencesContext"
import {
  filterSelectedIds,
  hasBeverageNotes,
  toTimeblockOptions,
} from "~/features/preview/preferences/selectors"
import { useBeverageSection } from "~/hooks/useBeverageSection"
import { useFoodSection } from "~/hooks/useFoodSection"

/** Estimate options: what prints, and how food packages are estimated. */
export function FinancialOptions() {
  const { state, dispatch } = usePreviewPreferences()
  const prefs = state["financial-report"]
  const { data: food } = useFoodSection()
  const { items: beverageItems } = useBeverageSection()

  // Add-on timeblocks are offered separately, never as package options.
  const foodOptions = toTimeblockOptions(food?.filter((tb) => !isAddOn(tb)))
  const packageSelected = filterSelectedIds(
    prefs.foodPackageTimeblockIds,
    foodOptions.map((o) => o.id),
  )

  return (
    <>
      <PreviewOptionSection title="Options">
        {(beverageItems?.length ?? 0) > 0 ? (
          <PreviewToggleRow
            id="financial-beverage-appendix"
            label="Show beverage list"
            checked={prefs.showBeverageAppendix}
            onChange={(value) => dispatch({ type: "financial/setShowBeverageAppendix", value })}
          />
        ) : null}
        {prefs.showBeverageAppendix && hasBeverageNotes(beverageItems) ? (
          <PreviewToggleRow
            id="financial-beverage-notes"
            label="Beverage notes"
            checked={prefs.showBeverageNotes}
            onChange={(value) => dispatch({ type: "financial/setShowBeverageNotes", value })}
          />
        ) : null}
        <PreviewToggleRow
          id="financial-charge-breakdown"
          label="Charge breakdown"
          checked={prefs.showChargeBreakdown}
          onChange={(value) => dispatch({ type: "financial/setShowChargeBreakdown", value })}
        />
        {foodOptions.length > 0 ? (
          <PreviewToggleRow
            id="financial-food-packages"
            label="Food packages"
            checked={prefs.showFoodPackages}
            onChange={(value) => dispatch({ type: "financial/setShowFoodPackages", value })}
          />
        ) : null}
        {prefs.showFoodPackages ? (
          <PreviewTimeblockSelector
            sectionLabel="Package timeblocks"
            options={foodOptions}
            selectedIds={packageSelected}
            onToggle={(id, value) =>
              dispatch({ type: "financial/setFoodPackageTimeblockSelected", id, value })
            }
            onSelectAll={() =>
              dispatch({
                type: "financial/selectAllFoodPackageTimeblocks",
                ids: foodOptions.map((o) => o.id),
              })
            }
            onClearAll={() => dispatch({ type: "financial/clearAllFoodPackageTimeblocks" })}
          />
        ) : null}
      </PreviewOptionSection>

      {prefs.showFoodPackages && packageSelected.length > 0 ? (
        <PreviewOptionSection title="Packages in Estimate">
          {FOOD_PACKAGE_ESTIMATE_MODE_OPTIONS.map(({ mode, label }) => (
            <PreviewRadioRow
              key={mode}
              id={`financial-food-package-mode-${mode}`}
              name="financial-food-package-mode"
              label={label}
              checked={prefs.foodPackageEstimateMode === mode}
              onSelect={() => dispatch({ type: "financial/setFoodPackageEstimateMode", value: mode })}
            />
          ))}
        </PreviewOptionSection>
      ) : null}
    </>
  )
}
