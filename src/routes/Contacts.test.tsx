import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import ContactsRoute from "./Contacts"

const contactsDirectoryWorkspaceMock = vi.fn()

vi.mock("~/features/contacts-directory/ContactsDirectoryWorkspace", () => ({
  default: () => contactsDirectoryWorkspaceMock(),
}))

describe("ContactsRoute", () => {
  it("shows route error boundary fallback when the contacts workspace throws", () => {
    contactsDirectoryWorkspaceMock.mockImplementation(() => {
      throw new Error("render crash")
    })

    render(<ContactsRoute />)

    expect(screen.getByText("Something went wrong")).toBeTruthy()
    expect(screen.getByText("The Contacts page hit an unexpected issue. Please reload and try again.")).toBeTruthy()
  })
})
