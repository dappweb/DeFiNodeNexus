import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: [
    'http://localhost:9002',
    'http://127.0.0.1:9002',
    'http://192.168.50.118:9002',
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
