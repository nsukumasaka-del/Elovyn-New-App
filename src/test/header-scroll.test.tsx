import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { Header } from "@/components/Header";
import { StoreProvider } from "@/lib/store";

describe("store header scroll treatment", () => {
  beforeEach(() => {
    Object.defineProperty(window, "scrollY", { configurable: true, writable: true, value: 0 });
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(() => undefined)));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    window.scrollY = 0;
  });

  it("is transparent at the top of the home page and solid after scrolling", () => {
    render(<MemoryRouter initialEntries={["/"]}><StoreProvider><Header /></StoreProvider></MemoryRouter>);
    expect(screen.getByRole("banner")).toHaveAttribute("data-header-state", "transparent");

    act(() => {
      window.scrollY = 51;
      window.dispatchEvent(new Event("scroll"));
    });
    expect(screen.getByRole("banner")).toHaveAttribute("data-header-state", "solid");

    act(() => {
      window.scrollY = 0;
      window.dispatchEvent(new Event("scroll"));
    });
    expect(screen.getByRole("banner")).toHaveAttribute("data-header-state", "transparent");
  });

  it("stays solid on non-home pages", () => {
    render(<MemoryRouter initialEntries={["/categories/streetwear"]}><StoreProvider><Header /></StoreProvider></MemoryRouter>);
    expect(screen.getByRole("banner")).toHaveAttribute("data-header-state", "solid");
  });
});
