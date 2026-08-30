"use client";

import { useSyncExternalStore } from "react";
import type { AuthResponse, User } from "./types";

const USER_KEY = "michi_user_profile";

// Access token is held in-memory only and never persisted to localStorage
let inMemoryAccessToken: string | null = null;
let cachedUser: User | null = null;
let isUserInitialized = false;

type AuthListener = (user: User | null) => void;
const listeners = new Set<AuthListener>();

function notifyListeners(user: User | null): void {
  listeners.forEach((listener) => {
    try {
      listener(user);
    } catch {
      // ignore listener errors
    }
  });
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function loadUserFromStorage(): User | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function getAccessToken(): string | null {
  return inMemoryAccessToken;
}

export function setAccessToken(token: string | null): void {
  inMemoryAccessToken = token;
}

export function getCurrentUser(): User | null {
  if (!isUserInitialized) {
    cachedUser = loadUserFromStorage();
    isUserInitialized = true;
  }
  return cachedUser;
}

export function setAuthSession(auth: AuthResponse): void {
  inMemoryAccessToken = auth.accessToken;
  cachedUser = auth.user;
  isUserInitialized = true;
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(USER_KEY, JSON.stringify(auth.user));
    notifyListeners(auth.user);
  } catch {
    // Storage might be disabled
  }
}

export function updateCurrentUser(user: User): void {
  cachedUser = user;
  isUserInitialized = true;
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(USER_KEY, JSON.stringify(user));
    notifyListeners(user);
  } catch {
    // Storage might be disabled
  }
}

export function clearAuthSession(): void {
  inMemoryAccessToken = null;
  cachedUser = null;
  isUserInitialized = true;
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(USER_KEY);
    notifyListeners(null);
  } catch {
    // Storage might be disabled
  }
}

export function subscribeAuth(listener: AuthListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function isAuthenticated(): boolean {
  return Boolean(inMemoryAccessToken || getCurrentUser());
}

function getClientSnapshot(): User | null {
  return getCurrentUser();
}

function getServerSnapshot(): User | null {
  return null;
}

function subscribeStore(callback: () => void): () => void {
  const unsub = subscribeAuth(callback);
  if (typeof window !== "undefined") {
    window.addEventListener("storage", callback);
  }
  return () => {
    unsub();
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", callback);
    }
  };
}

export function useAuth(): User | null {
  return useSyncExternalStore(subscribeStore, getClientSnapshot, getServerSnapshot);
}
