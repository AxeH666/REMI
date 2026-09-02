import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Preserve the repository's hand-written agent instructions during `next dev`.
  agentRules: false,
};

export default nextConfig;
