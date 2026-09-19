import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // AGENTS.md y CLAUDE.md son del proyecto: `next dev` no debe reescribirlos.
  agentRules: false,
};

export default nextConfig;
