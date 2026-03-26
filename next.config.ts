import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  env: {
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
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true, // Cloudflare Pages does not support Next.js default image optimization
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
