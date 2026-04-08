/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  experimental: {
    optimizePackageImports: ["recharts", "lucide-react", "date-fns"],
  },
};

module.exports = nextConfig;
