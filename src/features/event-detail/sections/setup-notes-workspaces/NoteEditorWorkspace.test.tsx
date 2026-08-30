import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { MemoryRouter, Route, Routes } from "react-router"

import NoteEditorWorkspace from "./NoteEditorWorkspace"
import { SECTION_TYPE } from "~/definitions/timeblocks/timeblock-constants"

const updateNoteMock = vi.fn()
const removeNoteMock = vi.fn()
const updateSetupMock = vi.fn()
const removeSetupMock = vi.fn()
const useNoteSectionMock = vi.fn()
const useSetupSectionMock = vi.fn()

vi.mock("~/hooks/useNoteSection", () => ({
  useNoteSection: () => useNoteSectionMock(),
}))

vi.mock("~/hooks/useSetupInstrucionSection", () => ({
  useSetupInstructionSection: () => useSetupSectionMock(),
}))

vi.mock("~/hooks/useTimeblockConversion", () => ({
  useTimeblockConversion: () => ({
    inspectConversion: vi.fn(),
    convertSectionType: vi.fn(),
    isInspecting: false,
    isConverting: false,
    isBusy: false,
  }),
}))

function renderNoteEditor(timeblockId = "tb-1") {
  return render(
    <MemoryRouter initialEntries={[`/events/event-1/timeblock/${timeblockId}`]}>
      <Routes>
        <Route
          path="/events/:id/timeblock/:timeblockId"
          element={
            <NoteEditorWorkspace
              timeblockId={timeblockId}
              onDeleted={vi.fn()}
              onNotFound={vi.fn()}
            />
          }
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe("NoteEditorWorkspace", () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it("renders a note with a type conversion control", () => {
    useNoteSectionMock.mockReturnValue({
      data: [
        {
          id: "tb-1",
          title: "Doors",
          time: "09:00",
          assignedTo: "Alex",
          details: "Open early",
          sectionType: SECTION_TYPE.NOTE,
        },
      ],
      isLoading: false,
      updateTimeblock: updateNoteMock,
      removeTimeblock: removeNoteMock,
    })
    useSetupSectionMock.mockReturnValue({
      data: [],
      isLoading: false,
      updateTimeblock: updateSetupMock,
      removeTimeblock: removeSetupMock,
    })

    renderNoteEditor()

    expect(screen.getByDisplayValue("Doors")).toBeTruthy()
    expect(screen.getByRole("button", { name: "Convert timeblock type" })).toBeTruthy()
  })

  it("deletes the selected note and notifies the parent", () => {
    const onDeleted = vi.fn()
    removeNoteMock.mockImplementation((_id: string, options?: { onSuccess?: () => void }) => {
      options?.onSuccess?.()
    })

    useNoteSectionMock.mockReturnValue({
      data: [
        {
          id: "tb-1",
          title: "Doors",
          time: "",
          assignedTo: "",
          details: "",
          sectionType: SECTION_TYPE.NOTE,
        },
      ],
      isLoading: false,
      updateTimeblock: updateNoteMock,
      removeTimeblock: removeNoteMock,
    })
    useSetupSectionMock.mockReturnValue({
      data: [],
      isLoading: false,
      updateTimeblock: updateSetupMock,
      removeTimeblock: removeSetupMock,
    })

    render(
      <MemoryRouter initialEntries={["/events/event-1/timeblock/tb-1"]}>
        <Routes>
          <Route
            path="/events/:id/timeblock/:timeblockId"
            element={
              <NoteEditorWorkspace
                timeblockId="tb-1"
                onDeleted={onDeleted}
                onNotFound={vi.fn()}
              />
            }
          />
        </Routes>
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole("button", { name: "Delete note" }))
    expect(removeNoteMock).toHaveBeenCalledWith("tb-1", expect.any(Object))
    expect(onDeleted).toHaveBeenCalledTimes(1)
  })

  it("calls onNotFound when the timeblock is missing after load", () => {
    const onNotFound = vi.fn()

    useNoteSectionMock.mockReturnValue({
      data: [],
      isLoading: false,
      updateTimeblock: updateNoteMock,
      removeTimeblock: removeNoteMock,
    })
    useSetupSectionMock.mockReturnValue({
      data: [],
      isLoading: false,
      updateTimeblock: updateSetupMock,
      removeTimeblock: removeSetupMock,
    })

    render(
      <MemoryRouter initialEntries={["/events/event-1/timeblock/missing"]}>
        <Routes>
          <Route
            path="/events/:id/timeblock/:timeblockId"
            element={
              <NoteEditorWorkspace
                timeblockId="missing"
                onDeleted={vi.fn()}
                onNotFound={onNotFound}
              />
            }
          />
        </Routes>
      </MemoryRouter>,
    )

    expect(onNotFound).toHaveBeenCalledTimes(1)
  })
})
