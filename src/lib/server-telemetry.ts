import { createNodeClient, registerAgent, reportDiscoveredEvents } from "@logfriends/sdk";
import { MichiEvents } from "./telemetry";

let registrationStarted = false;

export async function registerFrontendWorker(): Promise<void> {
  if (registrationStarted) return;
  registrationStarted = true;

  const ingestUrl = process.env.LOG_FRIENDS_INGEST_URL?.trim();
  if (!ingestUrl) {
    console.warn("[Log Friends] Frontend worker registration skipped: LOG_FRIENDS_INGEST_URL is not configured.");
    return;
  }

  // Loading the browser event catalog registers its defineEvent schemas before reporting.
  void MichiEvents;
  const client = createNodeClient({
    ingestUrl,
    workerId: "michi-frontend",
    autoHookProcessSignals: false,
  });
  const registration = await registerAgent(client, {
    appName: "michi",
    sourceType: "NODE",
    metadata: { runtime: "nextjs-server" },
  });
  if (!registration.success || registration.agentId === undefined) return;

  await reportDiscoveredEvents(client, {
    appName: "michi",
    agentId: registration.agentId,
  });
  console.info("[Log Friends] Frontend worker registered.");
}
