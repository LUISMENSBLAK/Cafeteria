import type { NextConfig } from "next";

const supabaseUrl = new URL(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xvhteomycrilopkxyjyu.supabase.co',
);

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: supabaseUrl.protocol === 'http:' ? 'http' : 'https',
        hostname: supabaseUrl.hostname,
        port: supabaseUrl.port,
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  serverExternalPackages: ['@opentelemetry/api'],
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', 'date-fns'],
    serverActions: {
      bodySizeLimit: '5mb',
    },
  },
};

export default nextConfig;
