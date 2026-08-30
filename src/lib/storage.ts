import type { Trip } from "./types";

export interface SavedTripSummary {
  id: string;
  title: string;
  date: string;
  area: string | null;
  stopsCount: number;
  savedAt: string;
}

const RECENT_TRIPS_STORAGE_KEY = "michi_recent_trips_v1";
const MAX_SAVED_TRIPS = 10;

function getStorage(): Storage | null {
  if (typeof window !== "undefined" && window.localStorage) {
    return window.localStorage;
  }
  if (typeof globalThis !== "undefined" && typeof (globalThis as unknown as { localStorage?: Storage }).localStorage !== "undefined") {
    return (globalThis as unknown as { localStorage: Storage }).localStorage;
  }
  return null;
}

export function getRecentTrips(): SavedTripSummary[] {
  const storage = getStorage();
  if (!storage) return [];
  try {
    const raw = storage.getItem(RECENT_TRIPS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is SavedTripSummary =>
        Boolean(item && typeof item === "object" && typeof item.id === "string" && typeof item.title === "string"),
    );
  } catch {
    return [];
  }
}

export function saveRecentTrip(trip: Trip): void {
  const storage = getStorage();
  if (!storage || !trip?.id) return;
  try {
    const existing = getRecentTrips().filter((t) => t.id !== trip.id);
    const summary: SavedTripSummary = {
      id: trip.id,
      title: trip.title || "ソウル一日旅プラン",
      date: trip.date,
      area: trip.preference?.area ?? null,
      stopsCount: trip.stops?.length ?? 0,
      savedAt: new Date().toISOString(),
    };
    const updated = [summary, ...existing].slice(0, MAX_SAVED_TRIPS);
    storage.setItem(RECENT_TRIPS_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Ignore localStorage write failures (e.g. storage full or private mode)
  }
}

export function removeRecentTrip(id: string): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    const existing = getRecentTrips().filter((t) => t.id !== id);
    storage.setItem(RECENT_TRIPS_STORAGE_KEY, JSON.stringify(existing));
  } catch {
    // Ignore localStorage write failures
  }
}

export function clearRecentTrips(): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.removeItem(RECENT_TRIPS_STORAGE_KEY);
  } catch {
    // Ignore
  }
}
