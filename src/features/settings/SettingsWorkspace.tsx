import { Navigate, useNavigate, useParams } from "react-router"

import { Body, Panel, SplitLayout } from "~/components/layouts/SplitLayout"

import { SettingsBodyHeader } from "./components/SettingsBodyHeader"
import { SETTINGS_CATEGORY_CONTENT } from "./components/settingsCategoryContent"
import { SettingsNav } from "./components/SettingsNav"
import { resolveSettingsCategory, settingsPath } from "./lib/settingsCategories"

/** The Settings page: category nav in the sidebar, the selected category in the body. */
const SettingsWorkspace: React.FC = () => {
  const { category: segment } = useParams<{ category?: string }>()
  const navigate = useNavigate()
  const category = resolveSettingsCategory(segment)

  if (!category) return <Navigate to={settingsPath()} replace />

  const CategoryContent = SETTINGS_CATEGORY_CONTENT[category.id]

  return (
    <SplitLayout>
      <SplitLayout.PanelWrapper>
        <Panel.Header>
          <span className="mr-auto text-sm font-semibold tracking-wide text-stone-100">Settings</span>
        </Panel.Header>
        <Panel.Content>
          <SettingsNav activeCategoryId={category.id} />
        </Panel.Content>
      </SplitLayout.PanelWrapper>

      <SplitLayout.BodyWrapper>
        <SettingsBodyHeader title={category.label} onBack={() => navigate("/events")} />
        <Body.Content>
          <div className="overflow-y-auto p-6">
            <div className="mx-auto max-w-2xl space-y-6">
              <p className="text-sm text-muted-foreground">{category.description}</p>
              <CategoryContent />
            </div>
          </div>
        </Body.Content>
      </SplitLayout.BodyWrapper>
    </SplitLayout>
  )
}

export default SettingsWorkspace
