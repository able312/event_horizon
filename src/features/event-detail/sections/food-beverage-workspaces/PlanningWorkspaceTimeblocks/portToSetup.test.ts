import { describe, expect, it } from "vitest"

import { toSetupInstructionEntry } from "./portToSetup"

describe("toSetupInstructionEntry", () => {
  it("writes the name, service style and client note", () => {
    expect(toSetupInstructionEntry({ name: "Steak", serviceStyle: "Plated", clientNotes: "Peppercorn jus" }))
      .toBe("## Steak\n# Plated\nPeppercorn jus\n\n")
  })

  it("leaves out a missing service style or blank note instead of writing null", () => {
    expect(toSetupInstructionEntry({ name: "Bread", serviceStyle: null, clientNotes: null })).toBe("## Bread\n\n")
    expect(toSetupInstructionEntry({ name: "Bread", serviceStyle: "", clientNotes: "  " })).toBe("## Bread\n\n")
  })
})
