import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { SplitLayout } from "~/components/layouts/SplitLayout"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "./dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"

function OpenPopover() {
  return (
    <Popover open>
      <PopoverTrigger>Open</PopoverTrigger>
      <PopoverContent data-testid="popover">Popover body</PopoverContent>
    </Popover>
  )
}

function OpenMenu() {
  return (
    <DropdownMenu open>
      <DropdownMenuTrigger>Open</DropdownMenuTrigger>
      <DropdownMenuContent data-testid="menu">Menu body</DropdownMenuContent>
    </DropdownMenu>
  )
}

afterEach(cleanup)

describe("dark surface portals", () => {
  it("renders popovers opened from the sidebar with the dark theme", () => {
    render(
      <SplitLayout.PanelWrapper footer={null}>
        <OpenPopover />
      </SplitLayout.PanelWrapper>,
    )

    const popover = screen.getByTestId("popover")
    expect(popover.closest("aside")).toBeNull()
    expect(popover.classList.contains("dark")).toBe(true)
  })

  it("renders dropdown menus opened from the sidebar with the dark theme", () => {
    render(
      <SplitLayout.PanelWrapper footer={null}>
        <OpenMenu />
      </SplitLayout.PanelWrapper>,
    )

    expect(screen.getByTestId("menu").classList.contains("dark")).toBe(true)
  })

  it("keeps popovers and menus in the light body light", () => {
    render(
      <SplitLayout.BodyWrapper>
        <OpenPopover />
        <OpenMenu />
      </SplitLayout.BodyWrapper>,
    )

    expect(screen.getByTestId("popover").classList.contains("dark")).toBe(false)
    expect(screen.getByTestId("menu").classList.contains("dark")).toBe(false)
  })
})
