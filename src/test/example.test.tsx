import { render, screen } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import Index from "../pages/Index";
import { StoreProvider } from "@/lib/store";

describe("homepage storefront", () => {
  it("renders the premium fashion storefront sections", () => {
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => {
      const payload = String(input).includes("/auth/me") ? { user: null } : { products: [] };
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

  it("renders showcase products only from the live listed catalog", async () => {
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      const payload = url.includes("/auth/me")
        ? { user: null }
        : url.includes("/settings")
          ? { settings: {} }
          : { products: [{ id: "live-product", title: "Live Inventory Jacket", price: 750, stock_quantity: 4, category: "Streetwear", image_url: null }] };
      return Promise.resolve(new Response(JSON.stringify(payload), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }));
    }));

    render(<MemoryRouter><StoreProvider><Index /></StoreProvider></MemoryRouter>);

    expect(await screen.findByText("Live Inventory Jacket")).toBeInTheDocument();
    expect(screen.queryByText("Essential Box Tee")).not.toBeInTheDocument();
  });

  afterEach(() => vi.unstubAllGlobals());
});
