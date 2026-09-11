"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { captureMichiEvent } from "@/lib/telemetry";

export function LogFriendsPageTracker() {
  const pathname = usePathname();
  useEffect(() => {
    const route = pathname.startsWith("/trips/") ? "/trips/:id" : pathname;
    captureMichiEvent("pageViewed", { context: { route } });
  }, [pathname]);
  return null;
}
