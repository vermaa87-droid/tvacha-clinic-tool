/** @type {import('next').NextConfig} */
const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
    ],
  },
  // Phase 5: re-enabled. If the build trips on a real lint error, fix the
  // underlying code rather than re-disabling this flag.
  eslint: {
    ignoreDuringBuilds: false,
  },
  experimental: {
    optimizePackageImports: [
      "recharts",
      "lucide-react",
      "date-fns",
      "framer-motion",
    ],
    serverComponentsExternalPackages: ["@react-pdf/renderer"],
  },
};

module.exports = withBundleAnalyzer(nextConfig);
