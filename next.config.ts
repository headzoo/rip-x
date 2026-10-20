import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep browser-test output separate from the developer's port-3003 server.
  distDir: process.env.RIP_X_E2E === "1" ? ".next-e2e" : ".next",
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    useTypeScriptCli: false,
  },
};

export default nextConfig;
