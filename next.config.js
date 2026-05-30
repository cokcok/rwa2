/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  images: {
    path: `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/_next/image`,
  },
  experimental: {
    serverComponentsExternalPackages: ['oracledb'],
  },
};

module.exports = nextConfig;