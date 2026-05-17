import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { Body } from "./SplitLayout"

describe("SplitLayout Body.Content", () => {
  it("renders a flex column shell that can host a fixed header and scroll viewport", () => {
    render(
      <Body.Content>
        <div data-testid="child" />
      </Body.Content>,
    )

    const container = screen.getByTestId("child").parentElement

    expect(container?.className).toContain("flex")
    expect(container?.className).toContain("flex-col")
    expect(container?.className).toContain("flex-1")
    expect(container?.className).toContain("min-h-0")
    expect(container?.className).toContain("overflow-hidden")
  })
})
