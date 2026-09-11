"use client";

import type { ReactNode } from "react";
import { StoreProvider } from "@/store/provider";
import { I18nProvider } from "@/lib/i18n";
import { LogFriendsPageTracker } from "./log-friends-page-tracker";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <StoreProvider>
      <I18nProvider>
        <LogFriendsPageTracker />
        {children}
      </I18nProvider>
    </StoreProvider>
  );
}
