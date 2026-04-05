import type {NextConfig} from 'next';

const isDev = process.env.NODE_ENV !== 'production'

// Trim helper: Vercel sometimes injects \r\n into env var values.
const e = (key: string, fallback = "") =>
  (process.env[key]?.trim() || process.env[key.replace(/^NEXT_PUBLIC_/, "")]?.trim() || fallback);

const nextConfig: NextConfig = {
  distDir: isDev ? '.next-dev' : '.next',
  // 'standalone' bundles all dependencies for self-hosted Node.js deployment.
  // After `npm run build`, run: node .next/standalone/server.js
  output: 'standalone',
  env: {
    NEXT_PUBLIC_SEPOLIA_RPC_URL:   e("NEXT_PUBLIC_SEPOLIA_RPC_URL") || e("SEPOLIA_RPC_URL"),
    NEXT_PUBLIC_NEXUS_ADDRESS:     e("NEXT_PUBLIC_NEXUS_ADDRESS")   || e("NEXUS_ADDRESS"),
    NEXT_PUBLIC_SWAP_ADDRESS:      e("NEXT_PUBLIC_SWAP_ADDRESS")    || e("SWAP_ADDRESS"),
    NEXT_PUBLIC_TOT_ADDRESS:       e("NEXT_PUBLIC_TOT_ADDRESS")     || e("TOT_TOKEN_ADDRESS"),
    NEXT_PUBLIC_TOF_ADDRESS:       e("NEXT_PUBLIC_TOF_ADDRESS")     || e("TOF_TOKEN_ADDRESS"),
    NEXT_PUBLIC_USDT_ADDRESS:      e("NEXT_PUBLIC_USDT_ADDRESS")    || e("USDT_TOKEN_ADDRESS"),
    NEXT_PUBLIC_CONTRACT_OWNER:    e("NEXT_PUBLIC_CONTRACT_OWNER")  || e("CONTRACT_OWNER"),
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
