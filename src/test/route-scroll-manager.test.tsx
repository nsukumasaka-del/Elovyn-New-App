import { act, render } from "@testing-library/react";
import { MemoryRouter, useNavigate } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RouteScrollManager } from "@/components/RouteScrollManager";

function NavigationButtons() {
  const navigate = useNavigate();
  return <>
    <button onClick={() => navigate("/categories/hoodies")}>Category</button>
    <button onClick={() => navigate("/#new-arrivals")}>Section</button>
    <div id="new-arrivals">New arrivals</div>
  </>;
}

describe("RouteScrollManager", () => {
  const scrollTo = vi.fn();
  const scrollIntoView = vi.fn();

  beforeEach(() => {
    scrollTo.mockReset();
    scrollIntoView.mockReset();
    vi.stubGlobal("scrollTo", scrollTo);
    Element.prototype.scrollIntoView = scrollIntoView;
  });

  it("scrolls to the top when navigating to another page", () => {
    const screen = render(<MemoryRouter initialEntries={["/"]}><RouteScrollManager /><NavigationButtons /></MemoryRouter>);
    scrollTo.mockClear();
    act(() => screen.getByRole("button", { name: "Category" }).click());
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: "auto" });
  });

  it("keeps intentional hash navigation working", () => {
    const screen = render(<MemoryRouter initialEntries={["/categories/hoodies"]}><RouteScrollManager /><NavigationButtons /></MemoryRouter>);
    scrollIntoView.mockClear();
    act(() => screen.getByRole("button", { name: "Section" }).click());
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "auto", block: "start" });
  });
});
