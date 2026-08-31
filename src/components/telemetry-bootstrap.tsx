"use client";

import { useEffect } from "react";
import { getLogFriendsClient } from "@/lib/telemetry";

/** Starts browser telemetry once for every loaded Michi application. */
export function TelemetryBootstrap(): null {
  useEffect(() => {
    getLogFriendsClient();
  }, []);

  return null;
}
