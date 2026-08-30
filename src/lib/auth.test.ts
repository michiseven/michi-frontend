import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearAuthSession,
  getAccessToken,
  getCurrentUser,
  isAuthenticated,
  setAccessToken,
  setAuthSession,
  subscribeAuth,
  updateCurrentUser,
} from "./auth";
import type { AuthResponse, User } from "./types";

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

describe("auth store", () => {
  const mockUser: User = {
    id: "u-123",
    displayName: "田中太郎",
    email: "tanaka@test.com",
    locale: "ja",
    createdAt: "2026-08-27T00:00:00.000Z",
  };

  const mockAuth: AuthResponse = {
    user: mockUser,
    accessToken: "test-access-token",
    expiresIn: 3600,
  };

  beforeEach(() => {
    storageMap.clear();
    clearAuthSession();
  });

  it("should return null when no session is saved", () => {
    expect(getAccessToken()).toBeNull();
    expect(getCurrentUser()).toBeNull();
    expect(isAuthenticated()).toBe(false);
  });

  it("should save in-memory access token and profile without storing refreshToken in localStorage", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeAuth(listener);

    setAuthSession(mockAuth);

    expect(getAccessToken()).toBe("test-access-token");
    expect(getCurrentUser()).toEqual(mockUser);
    expect(isAuthenticated()).toBe(true);
    expect(listener).toHaveBeenCalledWith(mockUser);

    // Verify localStorage contains user profile, but NEVER contains refreshToken or accessToken
    expect(storageMap.get("michi_user_profile")).toBe(JSON.stringify(mockUser));
    expect(storageMap.get("michi_refresh_token")).toBeUndefined();
    expect(storageMap.get("michi_access_token")).toBeUndefined();

    unsubscribe();
  });

  it("should update current user and notify subscribers", () => {
    setAuthSession(mockAuth);
    const listener = vi.fn();
    const unsubscribe = subscribeAuth(listener);

    const updated: User = { ...mockUser, displayName: "田中次郎" };
    updateCurrentUser(updated);

    expect(getCurrentUser()?.displayName).toBe("田中次郎");
    expect(listener).toHaveBeenCalledWith(updated);

    unsubscribe();
  });

  it("should clear auth session on logout", () => {
    setAuthSession(mockAuth);
    const listener = vi.fn();
    const unsubscribe = subscribeAuth(listener);

    clearAuthSession();

    expect(getAccessToken()).toBeNull();
    expect(getCurrentUser()).toBeNull();
    expect(isAuthenticated()).toBe(false);
    expect(listener).toHaveBeenCalledWith(null);
    expect(storageMap.get("michi_user_profile")).toBeUndefined();

    unsubscribe();
  });

  it("should support direct setAccessToken in-memory", () => {
    setAccessToken("direct-token");
    expect(getAccessToken()).toBe("direct-token");
    expect(storageMap.get("michi_access_token")).toBeUndefined();
  });
});
