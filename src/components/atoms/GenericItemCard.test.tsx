import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import GenericItemCard from "./GenericItemCard"

afterEach(() => {
  cleanup()
})

describe("GenericItemCard", () => {
  it("unpacks cents into dollar input, packs dollars back to cents, and renders cents-safe total", () => {
    const updateItem = vi.fn()

    render(
      <GenericItemCard
        item={{
          id: "food-1",
          name: "Chicken",
          quantity: 3,
          serviceStyle: "Plated",
          includes: null,
          unitPriceCents: 1250,
        }}
        updateItem={updateItem}
        removeItem={() => {}}
        serviceStyleOptions={["Plated", "Buffet"]}
      />,
    )

    const priceInput = screen.getByPlaceholderText("0.00") as HTMLInputElement
    expect(priceInput.value).toBe("12.50")
    expect(screen.getByText("$37.50")).toBeTruthy()

    fireEvent.change(priceInput, { target: { value: "12.34" } })
    fireEvent.blur(priceInput)
    expect(updateItem).toHaveBeenCalledWith("unitPriceCents", 1234)
  })

  it("clamps invalid or negative dollar input to zero cents", () => {
    const updateItem = vi.fn()

    render(
      <GenericItemCard
        item={{
          id: "food-2",
          name: "Salad",
          quantity: 1,
          serviceStyle: null,
          includes: null,
          unitPriceCents: null,
        }}
        updateItem={updateItem}
        removeItem={() => {}}
        serviceStyleOptions={["Plated"]}
      />,
    )

    const priceInput = screen.getByPlaceholderText("0.00") as HTMLInputElement

    fireEvent.change(priceInput, { target: { value: "abc" } })
    fireEvent.blur(priceInput)
    expect(updateItem).toHaveBeenCalledWith("unitPriceCents", 0)

    fireEvent.change(priceInput, { target: { value: "-1.25" } })
    fireEvent.blur(priceInput)
    expect(updateItem).toHaveBeenCalledWith("unitPriceCents", 0)
  })
})
