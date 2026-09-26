import { act } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { toast } from "sonner"

import * as eventContactsIpc from "~/lib/ipc/eventContacts"
import * as systemIpc from "~/lib/ipc/system"
import { renderHookWithProviders } from "~/test/renderHookWithProviders"

import { useEmailEventContacts } from "./useEmailEventContacts"

vi.mock("~/lib/ipc/eventContacts", () => ({ resolveEventRecipients: vi.fn() }))
vi.mock("~/lib/ipc/system", () => ({ openExternalUrl: vi.fn() }))
vi.mock("sonner", () => ({ toast: { error: vi.fn(), warning: vi.fn() } }))

afterEach(() => {
  vi.clearAllMocks()
})

describe("useEmailEventContacts", () => {
  it("opens one Gmail draft for all recipients and warns about contacts without email", async () => {
    vi.mocked(eventContactsIpc.resolveEventRecipients).mockResolvedValue({
      recipients: [
        { contactId: "c-1", displayName: "Sarah", email: "sarah@example.com" },
        { contactId: "c-2", displayName: "Mo", email: "mo@example.com" },
      ],
      skipped: [{ contactId: "c-3", displayName: "No Email" }],
    })

    const { result } = renderHookWithProviders(() => useEmailEventContacts("event-1", "Gala"))
    await act(() => result.current.emailContacts(["ec-1", "ec-2", "ec-3"]))

    expect(eventContactsIpc.resolveEventRecipients).toHaveBeenCalledWith("event-1", {
      eventContactIds: ["ec-1", "ec-2", "ec-3"],
    })
    const url = new URL(vi.mocked(systemIpc.openExternalUrl).mock.calls[0]![0])
    expect(url.searchParams.get("to")).toBe("sarah@example.com,mo@example.com")
    expect(url.searchParams.get("su")).toBe("Attn: Gala")
    expect(toast.warning).toHaveBeenCalledWith("No email on file for No Email")
  })

  it("does not open Gmail when nobody has an email", async () => {
    vi.mocked(eventContactsIpc.resolveEventRecipients).mockResolvedValue({
      recipients: [],
      skipped: [{ contactId: "c-3", displayName: "No Email" }],
    })

    const { result } = renderHookWithProviders(() => useEmailEventContacts("event-1", "Gala"))
    await act(() => result.current.emailContacts(["ec-3"]))

    expect(systemIpc.openExternalUrl).not.toHaveBeenCalled()
  })

  it("skips the IPC call for an empty selection", async () => {
    const { result } = renderHookWithProviders(() => useEmailEventContacts("event-1", "Gala"))
    await act(() => result.current.emailContacts([]))

    expect(eventContactsIpc.resolveEventRecipients).not.toHaveBeenCalled()
  })
})
