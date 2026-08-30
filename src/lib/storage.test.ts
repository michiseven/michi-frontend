import { beforeEach, describe, expect, it } from "vitest";
import { testTrip } from "@/test/fixtures";
import {
  clearRecentTrips,
  getRecentTrips,
  removeRecentTrip,
  saveRecentTrip,
} from "./storage";

const storageMap = new Map<string, string>();
const localStorageMock: Storage = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, value: string) => {
    storageMap.set(key, value);
  },
  removeItem: (key: string) => {
    storageMap.delete(key);
  },
  clear: () => {
    storageMap.clear();
  },
  key: (index: number) => Array.from(storageMap.keys())[index] ?? null,
  get length() {
    return storageMap.size;
  },
};

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
  configurable: true,
  writable: true,
});

describe("storage module (recent trips in localStorage)", () => {
  beforeEach(() => {
    storageMap.clear();
  });

  it("saves and retrieves recent trips", () => {
    expect(getRecentTrips()).toEqual([]);

    saveRecentTrip(testTrip);
    const trips = getRecentTrips();
    expect(trips).toHaveLength(1);
    expect(trips[0]!.id).toBe(testTrip.id);
    expect(trips[0]!.title).toBe(testTrip.title);
  });

  it("limits maximum stored recent trips to 10 and moves existing to top", () => {
    for (let i = 1; i <= 12; i++) {
      saveRecentTrip({
        ...testTrip,
        id: `trip-${i}`,
        title: `Trip ${i}`,
      });
    }

    const trips = getRecentTrips();
    expect(trips).toHaveLength(10);
    expect(trips[0]!.id).toBe("trip-12");
    expect(trips[9]!.id).toBe("trip-3");

    // Saving an existing trip moves it to index 0
    saveRecentTrip({ ...testTrip, id: "trip-5", title: "Trip 5 Updated" });
    const updated = getRecentTrips();
    expect(updated).toHaveLength(10);
    expect(updated[0]!.id).toBe("trip-5");
    expect(updated[0]!.title).toBe("Trip 5 Updated");
  });

  it("removes a single trip by ID and clears all", () => {
    saveRecentTrip({ ...testTrip, id: "trip-a" });
    saveRecentTrip({ ...testTrip, id: "trip-b" });

    expect(getRecentTrips()).toHaveLength(2);

    removeRecentTrip("trip-a");
    const afterRemove = getRecentTrips();
    expect(afterRemove).toHaveLength(1);
    expect(afterRemove[0]!.id).toBe("trip-b");

    clearRecentTrips();
    expect(getRecentTrips()).toEqual([]);
  });
});
