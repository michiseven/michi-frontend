export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "edge") return;

  const { registerFrontendWorker } = await import("./lib/server-telemetry");
  await registerFrontendWorker();
}
