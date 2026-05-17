import React from 'react'
import { useCartDetailsSection } from "~/hooks/useCartDetailsSection"

export const CartDetails = () => {
    const { data: details } = useCartDetailsSection()

    const grid = details?.customGrid ?? [
      [7, 5, 9, 10, 3, 1],
      [7, 5, 9, 10, 3, 1],
      [7, 5, 9, 10, 3, 1],
      [7, 5, 9, 10, 3, 1],
      [8, 6, 12, 11, 4, 2],
      [8, 6, 12, 11, 4, 2],
      [8, 6, 12, 11, 4, 2],
      [8, 6, 12, 11, 4, 2],
    ]

    const cartCount = grid?.flat().filter(cell => cell !== null).length ?? 0

    return (
      <div className='grid grid-cols-2'>
          <div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                <dt className="text-muted-foreground">Setup time</dt>
                <dd className="font-medium">{details?.time}</dd>

                <dt className="text-muted-foreground">Assigned to</dt>
                <dd className="font-medium">{details?.assignedTo}</dd>
            </dl>

            {details?.whatGoesOnCarts && (
              <div className="mt-3 pt-3 border-t text-sm">
                    <p className="text-muted-foreground mb-1">Goes on carts</p>
                    <pre className="font-sans whitespace-pre-wrap">{details.whatGoesOnCarts}</pre>
                </div>
            )}

            <p className='text-sm pt-4 text-stone-500'>Requires {cartCount} carts.</p>
          </div>

          <div className="my-3 text-sm grid grid-cols-[10%_20%_10%_20%_10%_10%] gap-1 justify-end items-center">
            {grid.map((row, ri) => (
              <React.Fragment key={`cart_row_${ri}`}>
                {row.map((cell, ci) => (
                  <div key={`cart_cell_${ri}_${ci}`} className={`w-5 h-5 ${cell ? "border-1 flex items-center justify-center" : ""} ${ci === 2 || ci === 4 ? "mr-6" : "mr-2"}`}>
                    { cell ? cell === "Lead" ? "L" : cell : "" }
                  </div>
                ))}
              </React.Fragment>
            ))}
        </div>
      </div>
    )
}