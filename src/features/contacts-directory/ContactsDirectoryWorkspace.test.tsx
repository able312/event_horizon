import { fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import { describe, expect, it, vi } from "vitest"

import ContactsDirectoryWorkspace from "./ContactsDirectoryWorkspace"

const useContactSearchMock = vi.fn()
const panelPropsMock = vi.fn()
const bodyPropsMock = vi.fn()

vi.mock("~/hooks/useEventContacts", () => ({
  useContactSearch: (...args: unknown[]) => useContactSearchMock(...args),
}))

vi.mock("./components/ContactsDirectoryPanel", () => ({
  default: (props: unknown) => {
    panelPropsMock(props)
    return <div data-testid="contacts-directory-panel" />
  },
}))

vi.mock("./components/ContactsDirectoryBody", () => ({
  default: (props: unknown) => {
    bodyPropsMock(props)
    return <div data-testid="contacts-directory-body" />
  },
}))

vi.mock("~/components/atoms/route-blocking-error", () => ({
  default: (props: { title: string; onRetry: () => void | Promise<void> }) => (
    <div data-testid="route-blocking-error">
      <button type="button" onClick={() => void props.onRetry()}>
        retry-load
      </button>
    </div>
  ),
}))

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/contacts" element={<ContactsDirectoryWorkspace />} />
        <Route path="/contacts/:contactId" element={<ContactsDirectoryWorkspace />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe("ContactsDirectoryWorkspace", () => {
  it("renders the panel and body on a healthy search", () => {
    useContactSearchMock.mockReturnValue({
      data: { items: [], nextCursor: null },
      isLoading: false,
      isError: false,
      isFetching: false,
      refetch: vi.fn(),
    })

    renderAt("/contacts")

    expect(screen.getByTestId("contacts-directory-panel")).toBeTruthy()
    expect(screen.getByTestId("contacts-directory-body")).toBeTruthy()
    expect(bodyPropsMock).toHaveBeenCalledWith(expect.objectContaining({ contactId: undefined, isCreating: false }))
  })

  it("passes the selected contactId from the route into the panel and body", () => {
    useContactSearchMock.mockReturnValue({
      data: { items: [], nextCursor: null },
      isLoading: false,
      isError: false,
      isFetching: false,
      refetch: vi.fn(),
    })

    renderAt("/contacts/c-1")

    expect(panelPropsMock).toHaveBeenCalledWith(expect.objectContaining({ selectedContactId: "c-1" }))
    expect(bodyPropsMock).toHaveBeenCalledWith(expect.objectContaining({ contactId: "c-1" }))
  })

  it("shows a blocking error when the directory search fails, and retries it", () => {
    const refetch = vi.fn()
    useContactSearchMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      isFetching: false,
      refetch,
    })

    renderAt("/contacts")

    expect(screen.getByTestId("route-blocking-error")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "retry-load" }))
    expect(refetch).toHaveBeenCalledTimes(1)
  })
})
