import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import SettingsRoute from "./Settings"

const settingsWorkspaceMock = vi.fn()

vi.mock("~/features/settings/SettingsWorkspace", () => ({
  default: () => settingsWorkspaceMock(),
}))

describe("SettingsRoute", () => {
  it("shows route error boundary fallback when the settings workspace throws", () => {
    settingsWorkspaceMock.mockImplementation(() => {
      throw new Error("render crash")
    })

    render(<SettingsRoute />)

    expect(screen.getByText("Something went wrong")).toBeTruthy()
    expect(screen.getByText("The Settings page hit an unexpected issue. Please reload and try again.")).toBeTruthy()
  })
})
