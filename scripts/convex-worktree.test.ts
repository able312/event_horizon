import { expect, it } from "vitest"
import { assertLocalDeployment } from "./convex-worktree.ts"

it("allows only local deployments with loopback renderer URLs", () => {
  expect(() => assertLocalDeployment("CONVEX_DEPLOYMENT=local:worktree\nVITE_CONVEX_URL=http://127.0.0.1:3210")).not.toThrow()
  for (const env of ["", "CONVEX_DEPLOYMENT=dev:shared\nVITE_CONVEX_URL=http://localhost:3210", "CONVEX_DEPLOYMENT=local:branch\nVITE_CONVEX_URL=https://shared.convex.cloud", "CONVEX_DEPLOYMENT=prod:venue\nVITE_CONVEX_URL=https://venue.convex.cloud"]) {
    expect(() => assertLocalDeployment(env)).toThrow(/refusing/)
  }
})
