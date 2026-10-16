import { useSearchParams } from "react-router"
import { getPreviewReturnState } from "./lib/previewReturnState"
import { SplitLayout } from "~/components/layouts/SplitLayout"

import PreviewBodyOrchestrator from "./body/PreviewBodyOrchestrator"
import PreviewPanelOrchestrator from "./panels/PreviewPanelOrchestrator"
import { PreviewPreferencesProvider } from "./preferences/PreviewPreferencesContext"

const PreviewWorkspace: React.FC = () => {
  const [searchParams] = useSearchParams()
  const saved = getPreviewReturnState(searchParams)
  return (
    <PreviewPreferencesProvider initialState={saved?.preferences}>
      <SplitLayout>
        <SplitLayout.PanelWrapper>
          <PreviewPanelOrchestrator />
        </SplitLayout.PanelWrapper>

        <SplitLayout.BodyWrapper>
          <PreviewBodyOrchestrator />
        </SplitLayout.BodyWrapper>
      </SplitLayout>
    </PreviewPreferencesProvider>
  )
}

export default PreviewWorkspace
