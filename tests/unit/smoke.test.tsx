import React from "react"
import { render, screen } from "@testing-library/react"

function SmokeComponent() {
  return React.createElement("h1", null, "DeFiNodeNexus Test Ready")
}

describe("test setup", () => {
  it("renders testing-library component", () => {
    render(React.createElement(SmokeComponent))
    expect(screen.getByRole("heading", { name: "DeFiNodeNexus Test Ready" })).toBeInTheDocument()
  })
})