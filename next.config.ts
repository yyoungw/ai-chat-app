import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@modelcontextprotocol/client",
    "@supabase/supabase-js",
  ],
};

export default nextConfig;
