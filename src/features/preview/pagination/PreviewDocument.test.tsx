import { act, render, waitFor } from "@testing-library/react"
import { StrictMode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { PreviewBlock, PreviewDocument } from "./PreviewDocument"
import { PreviewReadinessContext } from "./PreviewReadinessContext"

const measurement = vi.hoisted(() => ({ offsets: [400, 800, 1200, 1600] }))
vi.mock("./measureBlockBreaks", () => ({ measureBlockBreaks: () => measurement.offsets }))

let heights: Record<string, number>
let resize: ResizeObserverCallback | undefined
const observe = vi.fn<(target: Element) => void>()

beforeEach(() => {
  heights = {}
  measurement.offsets = [400, 800, 1200, 1600]
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    const height = heights[this.dataset.previewBlockId ?? this.dataset.previewContinuationKey ?? ""] ?? 1000
    return { x: 0, y: 0, top: 0, left: 0, right: 672, bottom: height, width: 672, height, toJSON: () => ({}) }
  })
  vi.stubGlobal("ResizeObserver", class {
    constructor(callback: ResizeObserverCallback) { resize = callback }
    observe = observe
    disconnect() {}
  })
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe("PreviewDocument pagination", () => {
  it("blocks export and shows recovery when document data fails", async () => {
    const report = vi.fn()
    heights.a = 100
    const { container } = render(
      <PreviewReadinessContext.Provider value={report}>
        <PreviewDocument dataError><PreviewBlock id="a">Partial content</PreviewBlock></PreviewDocument>
      </PreviewReadinessContext.Provider>,
    )
    await waitFor(() => expect(container.querySelector('[role="alert"]')?.textContent).toContain("Reload preview"))
    expect(container.querySelector('[data-preview-ready="true"]')).toBeNull()
    expect(report).toHaveBeenLastCalledWith(false)
  })

  it("updates row boundaries when content changes without changing block height", async () => {
    heights.contacts = 1800
    const document = (text: string) => <PreviewDocument>
      <PreviewBlock id="contacts">{text}</PreviewBlock>
    </PreviewDocument>
    const { container, rerender } = render(document("Original contacts"))
    await waitFor(() => expect(container.querySelectorAll("[data-preview-fragment]")).toHaveLength(3))
    measurement.offsets = [500, 900, 1400]
    rerender(document("Updated contacts with different row heights"))
    await waitFor(() => expect(container.querySelectorAll("[data-preview-fragment]")).toHaveLength(2))
    expect(container.querySelector<HTMLElement>("[data-preview-fragment]")?.style.height).toBe("900px")
  })

  it("renders contiguous fragments of long contact content", async () => {
    heights.contacts = 1800
    const { container } = render(
      <PreviewDocument><PreviewBlock id="contacts">Long contact list</PreviewBlock></PreviewDocument>,
    )
    await waitFor(() => expect(container.querySelectorAll("[data-preview-fragment]")).toHaveLength(3))
    const fragments = Array.from(container.querySelectorAll<HTMLElement>("[data-preview-fragment]"))
    expect(fragments.map((node) => [node.dataset.previewOffset, node.style.height])).toEqual([
      ["0", "800px"], ["800", "800px"], ["1600", "200px"],
    ])
    expect(fragments[2].textContent).toContain("Long contact list")
  })

  it("measures the same margin wrappers used by visible blocks and headings", async () => {
    heights.a = 900
    heights.b = 900
    heights.food = 42
    const { container } = render(
      <PreviewDocument continuationHeadings={{ food: <h2>Food continued</h2> }}>
        <PreviewBlock id="a" className="mb-6">First</PreviewBlock>
        <PreviewBlock id="b" continuationKey="food">Second</PreviewBlock>
      </PreviewDocument>,
    )
    await waitFor(() => expect(container.querySelector('[data-preview-ready="true"]')).toBeTruthy())
    expect(container.querySelector('[data-preview-block-id="a"] .mb-6')).toBeTruthy()
    expect(container.querySelector('[data-preview-continuation-key="food"] .mb-2')).toBeTruthy()
    expect(container.querySelectorAll("[data-preview-fragment]")).toHaveLength(2)
  })

  it("reports readiness only after data and layout are ready, and resets on unmount", async () => {
    const report = vi.fn()
    heights.a = 200
    const document = (dataReady: boolean) => (
      <PreviewReadinessContext.Provider value={report}>
        <PreviewDocument dataReady={dataReady}><PreviewBlock id="a">Event details</PreviewBlock></PreviewDocument>
      </PreviewReadinessContext.Provider>
    )
    const { rerender, unmount } = render(document(false))
    expect(report).toHaveBeenLastCalledWith(false)
    rerender(document(true))
    await waitFor(() => expect(report).toHaveBeenLastCalledWith(true))
    rerender(document(false))
    expect(report).toHaveBeenLastCalledWith(false)
    unmount()
    expect(report).toHaveBeenLastCalledWith(false)
  })

  it("becomes ready for an empty document whose measure root has no height", async () => {
    const report = vi.fn()
    heights[""] = 0
    const { container } = render(
      <PreviewReadinessContext.Provider value={report}><PreviewDocument>{null}</PreviewDocument></PreviewReadinessContext.Provider>,
    )
    await waitFor(() => expect(report).toHaveBeenLastCalledWith(true))
    expect(container.textContent).toContain("Nothing to preview.")
  })

  it("keeps pages and readiness when a parent re-renders identical content", async () => {
    const report = vi.fn()
    heights.a = 200
    const document = () => (
      <PreviewReadinessContext.Provider value={report}>
        <PreviewDocument continuationHeadings={{ food: <h2>Food continued</h2> }}>
          <PreviewBlock id="a">Event details</PreviewBlock>
        </PreviewDocument>
      </PreviewReadinessContext.Provider>
    )
    const { container, rerender } = render(document())
    await waitFor(() => expect(report).toHaveBeenLastCalledWith(true))
    report.mockClear()
    rerender(document())
    rerender(document())
    expect(report).not.toHaveBeenCalled()
    expect(container.querySelector('[data-preview-ready="true"]')).toBeTruthy()
  })

  it("still measures when StrictMode replays effects with unchanged markup", async () => {
    const report = vi.fn()
    heights.a = 200
    render(
      <StrictMode>
        <PreviewReadinessContext.Provider value={report}>
          <PreviewDocument><PreviewBlock id="a">Event details</PreviewBlock></PreviewDocument>
        </PreviewReadinessContext.Provider>
      </StrictMode>,
    )
    await waitFor(() => expect(report).toHaveBeenLastCalledWith(true))
  })

  it("keeps the previous pages visible while changed content is remeasured", async () => {
    const report = vi.fn()
    heights.a = 200
    const document = (text: string) => (
      <PreviewReadinessContext.Provider value={report}>
        <PreviewDocument><PreviewBlock id="a">{text}</PreviewBlock></PreviewDocument>
      </PreviewReadinessContext.Provider>
    )
    const { container, rerender } = render(document("Before"))
    await waitFor(() => expect(report).toHaveBeenLastCalledWith(true))
    rerender(document("After"))
    expect(report).toHaveBeenLastCalledWith(false)
    expect(container.textContent).not.toContain("Preparing pages")
    expect(container.querySelectorAll(".preview-page")).toHaveLength(1)
    await waitFor(() => expect(report).toHaveBeenLastCalledWith(true))
  })

  it("warns in development when a block has to be cut mid-line", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    measurement.offsets = []
    heights.wall = 1800
    render(<PreviewDocument><PreviewBlock id="wall">Unbreakable</PreviewBlock></PreviewDocument>)
    await waitFor(() => expect(warn).toHaveBeenCalledWith(expect.stringContaining('Block "wall"')))
  })

  it("remeasures individual blocks even when their total height stays the same", async () => {
    heights.a = 500
    heights.b = 500
    const { container } = render(
      <PreviewDocument><PreviewBlock id="a">A</PreviewBlock><PreviewBlock id="b">B</PreviewBlock></PreviewDocument>,
    )
    await waitFor(() => expect(container.querySelectorAll(".preview-page")).toHaveLength(2))
    expect(observe.mock.calls.some(([node]) => node instanceof HTMLElement && node.dataset.previewBlockId === "a")).toBe(true)
    heights.a = 950
    heights.b = 50
    act(() => resize?.([], {} as ResizeObserver))
    await waitFor(() => expect(container.querySelectorAll("[data-preview-fragment]")).toHaveLength(2))
  })
})
