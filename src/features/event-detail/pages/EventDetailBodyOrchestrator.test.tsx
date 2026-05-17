import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import EventDetailBodyOrchestrator from "./EventDetailBodyOrchestrator"

const routerPropsMock = vi.fn()

vi.mock("./EventDetailHeaderBar", () => ({
  default: () => <div data-testid="event-detail-header-bar" />,
}))

vi.mock("../components/DetailsTitleBar", () => ({
  default: () => <div data-testid="details-title-bar" />,
}))

vi.mock("../workspace/components/EventWorkspaceBodyRouter", () => ({
  default: (props: unknown) => {
    routerPropsMock(props)
    return <div data-testid="workspace-body-router" />
  },
}))

describe("EventDetailBodyOrchestrator", () => {
  it("renders header/title and routes selected node body", () => {
    const eventResource = {
      event: undefined,
      isLoading: true,
      updateEvent: vi.fn(async () => ({ id: "1" } as never)),
      deleteEvent: vi.fn(async () => true),
    }

    render(
      <EventDetailBodyOrchestrator
        eventResource={eventResource}
        selectedNode={null}
        onSelectNode={vi.fn()}
        timelineRows={[]}
        sectionRows={[]}
      />,
    )

    expect(screen.getByTestId("event-detail-header-bar")).toBeTruthy()
    expect(screen.getByTestId("details-title-bar")).toBeTruthy()
    expect(screen.getByTestId("workspace-body-router")).toBeTruthy()
    expect(screen.getByTestId("workspace-body-router").parentElement?.className).toContain("flex-1")
    expect(screen.getByTestId("workspace-body-router").parentElement?.className).toContain("min-h-0")
    expect(screen.getByTestId("workspace-body-router").parentElement?.className).toContain("overflow-hidden")
    expect(routerPropsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventResource,
        selectedNode: null,
      }),
    )
  })
})
