import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['next-cwv-monitor', '@t3-oss/env-nextjs', '@t3-oss/env-core']
};

export default nextConfig;
