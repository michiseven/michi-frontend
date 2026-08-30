import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { NaverMap, type MapStop } from "./naver-map";

const mockStops: MapStop[] = [
  { id: "stop-1", placeName: "聖水カフェ", latitude: 37.5445, longitude: 127.056 },
  { id: "stop-2", placeName: "ソウルの森", latitude: 37.543, longitude: 127.041 },
];

describe("NaverMap component", () => {
  it("renders coordinate fallback when clientId is not provided", () => {
    render(<NaverMap stops={mockStops} />);

    expect(screen.getByText("地図を表示できません")).toBeInTheDocument();
    expect(screen.getByText("聖水カフェ")).toBeInTheDocument();
    expect(screen.getByText("ソウルの森")).toBeInTheDocument();
    expect(screen.getByText(/37.54450, 127.05600/)).toBeInTheDocument();
  });

  it("calls onSelectStop when clicking a stop in fallback mode", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<NaverMap stops={mockStops} onSelectStop={onSelect} />);

    await user.click(screen.getByText("聖水カフェ"));
    expect(onSelect).toHaveBeenCalledWith("stop-1");

    await user.click(screen.getByText("ソウルの森"));
    expect(onSelect).toHaveBeenCalledWith("stop-2");
  });

  it("highlights the active stop in fallback mode", () => {
    render(<NaverMap stops={mockStops} activeStopId="stop-1" />);

    const item1 = screen.getByText("聖水カフェ").closest("li");
    const item2 = screen.getByText("ソウルの森").closest("li");

    expect(item1).toHaveClass("coordinate-item-active");
    expect(item2).not.toHaveClass("coordinate-item-active");
  });
});
