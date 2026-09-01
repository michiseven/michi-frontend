import { beforeEach, describe, expect, it, vi } from "vitest";
import * as logfriendsSdk from "@logfriends/sdk";

vi.mock("@logfriends/sdk", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@logfriends/sdk")>();
  return {
    ...actual,
    createBrowserClient: vi.fn(),
    trackEvent: vi.fn(),
  };
});

describe("Michi telemetry adapter with Log Friends SDK", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.mocked(logfriendsSdk.createBrowserClient).mockReset();
    vi.mocked(logfriendsSdk.trackEvent).mockReset();
  });

  it("creates a browser client and tracks schema-defined events", async () => {
    const mockClient = {
      track: vi.fn(),
      flush: vi.fn().mockResolvedValue({ status: "sent", sent: 1, pending: 0 }),
      identify: vi.fn(),
    };
    vi.mocked(logfriendsSdk.createBrowserClient).mockReturnValue(
      mockClient as unknown as logfriendsSdk.BrowserLogFriendsClient,
    );

    const { captureMichiEvent, MichiEvents } = await import("./telemetry");

    captureMichiEvent("trip_requested", {
      context: { hasDate: true, hasBudget: true },
    });

    expect(logfriendsSdk.createBrowserClient).toHaveBeenCalledOnce();
    expect(logfriendsSdk.trackEvent).toHaveBeenCalledWith(
      mockClient,
      MichiEvents.tripRequested,
      expect.objectContaining({ hasDate: true, hasBudget: true }),
      { uiContext: { componentPath: ["HomePage", "PlannerForm"] } },
    );
    expect(MichiEvents.tripRequested.name).toBe("tripRequested");
  });

  it("maps the legacy snake_case callsite name to a valid camelCase SDK event", async () => {
    const mockClient = { track: vi.fn(), flush: vi.fn(), identify: vi.fn() };
    vi.mocked(logfriendsSdk.createBrowserClient).mockReturnValue(
      mockClient as unknown as logfriendsSdk.BrowserLogFriendsClient,
    );
    const { captureMichiEvent, MichiEvents } = await import("./telemetry");

    captureMichiEvent("place_added", { tripId: "trip-1", placeId: "place-1" });

    expect(logfriendsSdk.trackEvent).toHaveBeenCalledWith(
      mockClient,
      MichiEvents.placeAdded,
      expect.objectContaining({ tripId: "trip-1", placeId: "place-1" }),
      { uiContext: { componentPath: ["HomePage", "TripView", "TripTimeline", "PlaceCard"] } },
    );
    expect(MichiEvents.placeAdded.name).toBe("placeAdded");
  });

  it("allows a call site to override the default component branch", async () => {
    const mockClient = { track: vi.fn(), flush: vi.fn(), identify: vi.fn() };
    vi.mocked(logfriendsSdk.createBrowserClient).mockReturnValue(
      mockClient as unknown as logfriendsSdk.BrowserLogFriendsClient,
    );
    const { captureMichiEvent, MichiEvents } = await import("./telemetry");

    captureMichiEvent("trip_generated", {
      tripId: "trip-1",
      componentPath: ["HomePage", "GenerativeChatPlanner", "ChatResponse"],
    });

    expect(logfriendsSdk.trackEvent).toHaveBeenCalledWith(
      mockClient,
      MichiEvents.tripGenerated,
      expect.objectContaining({ tripId: "trip-1" }),
      { uiContext: { componentPath: ["HomePage", "GenerativeChatPlanner", "ChatResponse"] } },
    );
  });

  it("swallows SDK errors and never crashes the caller", async () => {
    vi.mocked(logfriendsSdk.createBrowserClient).mockImplementation(() => {
      throw new Error("SDK init network error");
    });

    const { captureMichiEvent } = await import("./telemetry");

    expect(() =>
      captureMichiEvent("route_started", { tripId: "trip-1" }),
    ).not.toThrow();
  });
});
