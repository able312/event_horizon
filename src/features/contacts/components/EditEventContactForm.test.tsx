import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { Contact, EventContactsPanelItem } from "~/definitions/contacts"
import { EditEventContactForm, type EditTarget } from "./EditEventContactForm"

const contactState: { data: Contact } = { data: makeContact() }

vi.mock("~/hooks/useEventContacts", () => ({
  useContact: () => ({ data: contactState.data, isLoading: false, isError: false }),
  useVendorCategories: () => ({ data: [], isLoading: false, isError: false }),
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
    notes: null,
    archivedAt: null,
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
    ...overrides,
  }
}

function makeTarget(overrides: Partial<EventContactsPanelItem> = {}): EditTarget {
  return {
    role: "client",
    item: {
      eventContactId: "ec-1",
      contactId: "contact-1",
      displayName: "Ada Client",
      initials: "AC",
      email: "ada@example.com",
      phone: null,
      roleLabel: null,
      notes: null,
      vendorCategory: null,
      isPrimary: true,
      contactArchived: false,
      ...overrides,
    },
  }
}

function renderForm(target: EditTarget, onSave = vi.fn(async () => undefined), onClose = vi.fn()) {
  const view = render(<EditEventContactForm target={target} isSaving={false} onSave={onSave} onClose={onClose} />)
  return { ...view, onSave, onClose }
}

afterEach(() => {
  contactState.data = makeContact()
  cleanup()
})

describe("EditEventContactForm", () => {
  it("sends only the contact and assignment fields that changed", async () => {
    const { onSave } = renderForm(makeTarget())

    fireEvent.change(screen.getByLabelText("Last name"), { target: { value: "Renamed" } })
    fireEvent.change(screen.getByPlaceholderText("e.g. Arrival time, who they report to"), { target: { value: "Arrives 5pm" } })
    fireEvent.click(screen.getByRole("button", { name: "Save" }))

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        eventContactId: "ec-1",
        contact: { lastName: "Renamed" },
        assignment: { notes: "Arrives 5pm" },
      })
    })
  })

  it("closes without saving when nothing changed", () => {
    const { onSave, onClose } = renderForm(makeTarget())

    fireEvent.click(screen.getByRole("button", { name: "Save" }))

    expect(onSave).not.toHaveBeenCalled()
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("keeps typed values through live updates and doesn't resend other people's changes", async () => {
    const { onSave, rerender } = renderForm(makeTarget())
    fireEvent.change(screen.getByLabelText("Last name"), { target: { value: "Mine" } })

    contactState.data = makeContact({ lastName: "Theirs", phone: "555-0100" })
    rerender(<EditEventContactForm target={makeTarget({ notes: "Their note" })} isSaving={false} onSave={onSave} onClose={vi.fn()} />)

    expect((screen.getByLabelText("Last name") as HTMLInputElement).value).toBe("Mine")
    expect((screen.getByLabelText(/Phone/) as HTMLInputElement).value).toBe("555-0100")
    expect(screen.getByDisplayValue("Their note")).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "Save" }))
    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({ eventContactId: "ec-1", contact: { lastName: "Mine" }, assignment: {} })
    })
  })
})
