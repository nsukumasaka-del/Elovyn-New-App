import { render, screen } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import Index from "../pages/Index";
import { StoreProvider } from "@/lib/store";

describe("homepage storefront", () => {
  it("renders the premium fashion storefront sections", () => {
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => {
      const payload = String(input).includes("/auth/session") ? { user: null } : { products: [] };
      return Promise.resolve(new Response(JSON.stringify(payload), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }));
    }));
    render(<MemoryRouter><StoreProvider><Index /></StoreProvider></MemoryRouter>);

    expect(screen.getAllByText(/new arrivals/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/streetwear/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/stay in the loop/i)).toBeInTheDocument();
  });

  afterEach(() => vi.unstubAllGlobals());
});
