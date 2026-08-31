export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { registerFrontendWorker } = await import("./src/lib/server-telemetry");
  await registerFrontendWorker();
}
