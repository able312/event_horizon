import { render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import { describe, expect, it, vi } from "vitest"

import SettingsWorkspace from "./SettingsWorkspace"

vi.mock("~/components/layouts/SidebarFooter", () => ({
  SidebarFooter: () => <div data-testid="sidebar-footer" />,
}))

vi.mock("./profile/ProfileSettings", () => ({
  ProfileSettings: () => <div data-testid="profile-settings" />,
}))

vi.mock("./beverage-menu/BeverageMenuSettings", () => ({
  BeverageMenuSettings: () => <div data-testid="beverage-menu-settings" />,
}))

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/settings/:category?" element={<SettingsWorkspace />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe("SettingsWorkspace", () => {
  it("opens Profile when no category is in the URL", () => {
    renderAt("/settings")

    expect(screen.getByTestId("profile-settings")).toBeTruthy()
    expect(screen.getByRole("link", { name: "Profile" }).getAttribute("aria-current")).toBe("page")
  })

  it("sends an unknown category back to the default one", () => {
    renderAt("/settings/not-a-category")

    expect(screen.getByTestId("profile-settings")).toBeTruthy()
    expect(screen.getByRole("heading", { level: 1, name: "Profile" })).toBeTruthy()
  })

  it("opens a venue category from its URL", () => {
    renderAt("/settings/beverage-menu")

    expect(screen.getByTestId("beverage-menu-settings")).toBeTruthy()
    expect(screen.getByRole("link", { name: "Beverage Menu" }).getAttribute("aria-current")).toBe("page")
  })
})
