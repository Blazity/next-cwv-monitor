import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@t3-oss/env-nextjs', '@t3-oss/env-core', 'cwv-monitor-contracts'],
  serverExternalPackages: ['pino'],
  cacheComponents: true,
  // TODO: no global CORS headers; API routes should set their own policies.
};

export default nextConfig;
