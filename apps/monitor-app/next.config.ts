import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typedRoutes: true,
  transpilePackages: ["@t3-oss/env-nextjs", "@t3-oss/env-core", "cwv-monitor-contracts"],
  serverExternalPackages: ["pino"],
  cacheComponents: true,
};

export default nextConfig;
