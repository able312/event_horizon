import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { Contact } from "~/definitions/contacts"
import { ContactEditForm } from "./ContactEditForm"

const mutateAsync = vi.fn(async () => undefined)

vi.mock("~/hooks/useEventContacts", () => ({
  useUpdateContact: () => ({ mutateAsync, isPending: false }),
}))
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

function makeContact(overrides: Partial<Contact> = {}): Contact {
  return {
    id: "contact-1",
    kind: "individual",
    firstName: "Ada",
    lastName: "Client",
    organizationName: null,
    displayName: "Ada Client",
    email: "ada@example.com",
    emailNormalized: "ada@example.com",
    phone: null,
    notes: "Original note",
    archivedAt: null,
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
    ...overrides,
  }
}

function renderForm(contact: Contact, onSaved = vi.fn()) {
  const view = render(
    <MemoryRouter>
      <ContactEditForm contact={contact} onSaved={onSaved} onCancel={vi.fn()} />
    </MemoryRouter>,
  )
  const rerenderWith = (next: Contact) =>
    view.rerender(
      <MemoryRouter>
        <ContactEditForm contact={next} onSaved={onSaved} onCancel={vi.fn()} />
      </MemoryRouter>,
    )
  return { onSaved, rerenderWith }
}

afterEach(() => {
  vi.clearAllMocks()
  cleanup()
})

describe("ContactEditForm", () => {
  it("sends only the fields that changed", async () => {
    const { onSaved } = renderForm(makeContact())

    fireEvent.change(screen.getByDisplayValue("Original note"), { target: { value: "  " } })
    fireEvent.click(screen.getByRole("button", { name: "Save" }))

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({ id: "contact-1", patch: { notes: null } })
    })
    expect(onSaved).toHaveBeenCalledTimes(1)
  })

  it("closes without saving when nothing changed", () => {
    const { onSaved } = renderForm(makeContact())

    fireEvent.click(screen.getByRole("button", { name: "Save" }))

    expect(mutateAsync).not.toHaveBeenCalled()
    expect(onSaved).toHaveBeenCalledTimes(1)
  })

  it("keeps typed values when the contact updates live", async () => {
    const { rerenderWith } = renderForm(makeContact())
    fireEvent.change(screen.getByLabelText("First name"), { target: { value: "Adah" } })

    rerenderWith(makeContact({ firstName: "Ady", email: "new@example.com" }))

    expect((screen.getByLabelText("First name") as HTMLInputElement).value).toBe("Adah")
    expect((screen.getByLabelText("Email") as HTMLInputElement).value).toBe("new@example.com")

    fireEvent.click(screen.getByRole("button", { name: "Save" }))
    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({ id: "contact-1", patch: { firstName: "Adah" } })
    })
  })
})
