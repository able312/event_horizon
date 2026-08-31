import { SplitLayout } from "~/components/layouts/SplitLayout"

import PreviewBodyOrchestrator from "./body/PreviewBodyOrchestrator"
import PreviewPanelOrchestrator from "./panels/PreviewPanelOrchestrator"

const PreviewWorkspace: React.FC = () => {
  return (
    <SplitLayout>
      <SplitLayout.PanelWrapper>
        <PreviewPanelOrchestrator />
      </SplitLayout.PanelWrapper>

      <SplitLayout.BodyWrapper>
        <PreviewBodyOrchestrator />
      </SplitLayout.BodyWrapper>
    </SplitLayout>
  )
}

export default PreviewWorkspace
