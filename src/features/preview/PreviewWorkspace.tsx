import { SplitLayout } from "~/components/layouts/SplitLayout"

import PreviewBodyOrchestrator from "./body/PreviewBodyOrchestrator"
import PreviewPanelOrchestrator from "./panels/PreviewPanelOrchestrator"
import { PreviewPreferencesProvider } from "./preferences/PreviewPreferencesContext"

const PreviewWorkspace: React.FC = () => {
  return (
    <PreviewPreferencesProvider>
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
