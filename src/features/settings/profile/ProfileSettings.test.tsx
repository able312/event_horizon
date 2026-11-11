import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import type { CurrentUser } from "~/definitions/database"

import { ProfileSettings } from "./ProfileSettings"

const useCurrentUserMock = vi.fn()

vi.mock("./useCurrentUser", () => ({
  useCurrentUser: () => useCurrentUserMock(),
}))

const user: CurrentUser = {
  id: "user-1",
  workosUserId: "user_test",
  email: "sam@westlinks.ca",
  name: "Sam Staff",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
}

function hookState(overrides: Record<string, unknown> = {}) {
  return {
    data: user,
    isLoading: false,
    isError: false,
    isFetching: false,
    refetch: vi.fn(),
    saveName: vi.fn(),
    isSavingName: false,
    ...overrides,
  }
}

describe("ProfileSettings", () => {
  it("shows the current name and read-only email", () => {
    useCurrentUserMock.mockReturnValue(hookState())
    render(<ProfileSettings />)

    expect((screen.getByLabelText("Name") as HTMLInputElement).value).toBe("Sam Staff")
    expect(screen.getByText("sam@westlinks.ca")).toBeTruthy()
    expect(screen.queryByRole("textbox", { name: /email/i })).toBeNull()
  })

  it("saves only a changed, valid name", () => {
    const state = hookState()
    useCurrentUserMock.mockReturnValue(state)
    render(<ProfileSettings />)

    const save = screen.getByRole("button", { name: "Save" }) as HTMLButtonElement
    expect(save.disabled).toBe(true)

    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "  Sammy " } })
    fireEvent.click(save)
    expect(state.saveName).toHaveBeenCalledWith("Sammy")
  })

  it("shows a blocking error with retry when the profile can't load", () => {
    const state = hookState({ data: undefined, isError: true })
    useCurrentUserMock.mockReturnValue(state)
    render(<ProfileSettings />)

    expect(screen.getByText("Could not load your profile")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Retry" }))
    expect(state.refetch).toHaveBeenCalled()
  })
})
