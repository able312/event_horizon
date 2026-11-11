import { describe, expect, it } from "vitest"

import { inboxReturnPath } from "./inboxReturnPath"

describe("inboxReturnPath", () => {
  it("returns to the Inbox, keeping the month but dropping a search", () => {
    expect(inboxReturnPath("?date=2027-06&search=gala")).toBe("/events?date=2027-06&view=inbox")
    expect(inboxReturnPath("")).toBe("/events?view=inbox")
  })
})
