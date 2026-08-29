import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

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

describe("NoteEditorWorkspace", () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it("renders a note and converts it to a setup instruction", () => {
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

    render(
      <NoteEditorWorkspace
        timeblockId="tb-1"
        onDeleted={vi.fn()}
        onNotFound={vi.fn()}
      />,
    )

    expect(screen.getByDisplayValue("Doors")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Convert to Setup Instruction" }))
    expect(updateNoteMock).toHaveBeenCalledWith({
      id: "tb-1",
      updates: { sectionType: SECTION_TYPE.SETUP_INSTRUCTION },
    })
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
      <NoteEditorWorkspace
        timeblockId="tb-1"
        onDeleted={onDeleted}
        onNotFound={vi.fn()}
      />,
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
      <NoteEditorWorkspace
        timeblockId="missing"
        onDeleted={vi.fn()}
        onNotFound={onNotFound}
      />,
    )

    expect(onNotFound).toHaveBeenCalledTimes(1)
  })
})
