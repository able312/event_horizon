import { fireEvent, render, screen } from "@testing-library/react"
import { expect, it, vi } from "vitest"
import { UpdateReadyButton } from "./UpdateReadyButton"

it("installs only after confirmation and leaves cancellation usable", () => {
  const install = vi.fn()
  render(<UpdateReadyButton version="0.1.1" shouldAnnounce={false}
    onAnnounced={vi.fn()} onInstall={install} />)
  fireEvent.click(screen.getByRole("button", { name: "Update to v0.1.1 and restart" }))
  expect(screen.getByText(/Any unsaved changes will be/)).toBeTruthy()
  expect(install).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole("button", { name: "Not now" }))
  expect(install).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole("button", { name: "Update to v0.1.1 and restart" }))
  fireEvent.click(screen.getByRole("button", { name: "Update and restart" }))
  expect(install).toHaveBeenCalledOnce()
})

it("offers a retry after a failed install", () => {
  const install = vi.fn()
  render(<UpdateReadyButton version="0.1.1" installFailed shouldAnnounce={false}
    onAnnounced={vi.fn()} onInstall={install} />)
  fireEvent.click(screen.getByRole("button", { name: "Could not install v0.1.1. Click to try again" }))
  fireEvent.click(screen.getByRole("button", { name: "Update and restart" }))
  expect(install).toHaveBeenCalledOnce()
})
