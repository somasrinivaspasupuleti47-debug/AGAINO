/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost', port: '4000', pathname: '/**' },
      { protocol: 'https', hostname: '**' },
    ],
    unoptimized: true,
  },
};

module.exports = nextConfig;
