import type { NextConfig } from "next";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const frontendDirectory = dirname(fileURLToPath(import.meta.url));
const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");

const nextConfig: NextConfig = {
  agentRules: false,
  basePath,
  output: "standalone",
  outputFileTracingRoot: frontendDirectory,
  poweredByHeader: false,
  transpilePackages: ["@logfriends/sdk"],
  turbopack: { root: frontendDirectory },
};

export default nextConfig;
