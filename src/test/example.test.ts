import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import Index from "../pages/Index";

describe("homepage storefront", () => {
  it("renders the premium fashion storefront sections", () => {
    render(<Index />);

    expect(screen.getByText(/new arrivals/i)).toBeInTheDocument();
    expect(screen.getByText(/streetwear/i)).toBeInTheDocument();
    expect(screen.getByText(/stay in the loop/i)).toBeInTheDocument();
  });
});
