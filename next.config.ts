import type {NextConfig} from 'next';

const isDev = process.env.NODE_ENV !== 'production'

const nextConfig: NextConfig = {
  distDir: isDev ? '.next-dev' : '.next',
  // 'standalone' bundles all dependencies for self-hosted Node.js deployment.
  // After `npm run build`, run: node .next/standalone/server.js
  output: 'standalone',
  env: {
    NEXT_PUBLIC_SEPOLIA_RPC_URL:
      process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || process.env.SEPOLIA_RPC_URL || "",
    NEXT_PUBLIC_NEXUS_ADDRESS:
      process.env.NEXT_PUBLIC_NEXUS_ADDRESS || process.env.NEXUS_ADDRESS || "",
    NEXT_PUBLIC_SWAP_ADDRESS:
      process.env.NEXT_PUBLIC_SWAP_ADDRESS || process.env.SWAP_ADDRESS || "",
    NEXT_PUBLIC_TOT_ADDRESS:
      process.env.NEXT_PUBLIC_TOT_ADDRESS || process.env.TOT_TOKEN_ADDRESS || "",
    NEXT_PUBLIC_TOF_ADDRESS:
      process.env.NEXT_PUBLIC_TOF_ADDRESS || process.env.TOF_TOKEN_ADDRESS || "",
    NEXT_PUBLIC_USDT_ADDRESS:
      process.env.NEXT_PUBLIC_USDT_ADDRESS || process.env.USDT_TOKEN_ADDRESS || "",
  },
  ...(isDev && {
    allowedDevOrigins: [
      'http://localhost:9002',
      'http://127.0.0.1:9002',
      'http://192.168.50.118:9002',
      'localhost:9002',
      '127.0.0.1:9002',
      'http://localhost',
      'http://127.0.0.1',
      'localhost',
      '127.0.0.1',
    ],
  }),
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true, // disable built-in image optimization (no sharp installed on the server)
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
