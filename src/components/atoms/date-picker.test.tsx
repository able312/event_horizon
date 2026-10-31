import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { useState } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { DatePicker } from "./date-picker"

function ControlledPicker({
  initial = null,
  minDate,
  onChange,
}: {
  initial?: Date | null
  minDate?: Date
  onChange: (date: Date | null) => void
}) {
  const [value, setValue] = useState<Date | null>(initial)
  return (
    <DatePicker
      value={value}
      minDate={minDate}
      placeholder="Pick a date"
      onChange={(next) => {
        onChange(next)
        setValue(next)
      }}
    />
  )
}

function getInput() {
  return screen.getByPlaceholderText<HTMLInputElement>("Pick a date")
}

describe("DatePicker typed entry", () => {
  let originalTz: string | undefined

  beforeEach(() => {
    originalTz = process.env.TZ
    process.env.TZ = "America/Toronto"
  })

  afterEach(() => {
    cleanup()
    if (originalTz === undefined) delete process.env.TZ
    else process.env.TZ = originalTz
  })

  it("keeps partial input as typed instead of committing it", () => {
    const onChange = vi.fn()
    render(<ControlledPicker onChange={onChange} />)

    for (const text of ["2", "2026", "2026-03", "2026-03-0", "2026-03-09"]) {
      fireEvent.change(getInput(), { target: { value: text } })
      expect(getInput().value).toBe(text)
    }
    expect(onChange).not.toHaveBeenCalled()
  })

  it("commits a typed ISO date as the local day on blur", () => {
    const onChange = vi.fn()
    render(<ControlledPicker onChange={onChange} />)

    fireEvent.change(getInput(), { target: { value: "2026-03-09" } })
    fireEvent.blur(getInput())

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith(new Date(2026, 2, 9))
    expect(getInput().value).toBe("March 09, 2026")
  })

  it("commits on Enter and blocks form submission for that keypress", () => {
    const onChange = vi.fn()
    render(<ControlledPicker onChange={onChange} />)

    fireEvent.change(getInput(), { target: { value: "2026-03-09" } })
    const notCancelled = fireEvent.keyDown(getInput(), { key: "Enter" })

    expect(notCancelled).toBe(false)
    expect(onChange).toHaveBeenCalledWith(new Date(2026, 2, 9))
  })

  it("lets Enter through once the text matches the committed date", () => {
    render(<ControlledPicker initial={new Date(2026, 2, 9)} onChange={vi.fn()} />)

    expect(fireEvent.keyDown(getInput(), { key: "Enter" })).toBe(true)
  })

  it("reverts invalid or too-early text on blur without emitting", () => {
    const onChange = vi.fn()
    render(
      <ControlledPicker
        initial={new Date(2026, 2, 9)}
        minDate={new Date(2026, 2, 1)}
        onChange={onChange}
      />,
    )

    fireEvent.change(getInput(), { target: { value: "not a date" } })
    fireEvent.blur(getInput())
    expect(getInput().value).toBe("March 09, 2026")

    fireEvent.change(getInput(), { target: { value: "2026-02-15" } })
    fireEvent.blur(getInput())
    expect(getInput().value).toBe("March 09, 2026")

    expect(onChange).not.toHaveBeenCalled()
  })

  it("does not re-emit when the typed day matches the current value", () => {
    const onChange = vi.fn()
    render(<ControlledPicker initial={new Date(2026, 2, 9, 15, 30)} onChange={onChange} />)

    fireEvent.change(getInput(), { target: { value: "2026-03-09" } })
    fireEvent.blur(getInput())

    expect(onChange).not.toHaveBeenCalled()
    expect(getInput().value).toBe("March 09, 2026")
  })

  it("clears the value as soon as the text is emptied", () => {
    const onChange = vi.fn()
    render(<ControlledPicker initial={new Date(2026, 2, 9)} onChange={onChange} />)

    fireEvent.change(getInput(), { target: { value: "" } })

    expect(onChange).toHaveBeenCalledWith(null)
  })
})
