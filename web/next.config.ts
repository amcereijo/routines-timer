import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */

  // Allow the dev server to be reached through a tunnel (e.g. ngrok).
  // Entries are hostnames only — no scheme, port, or path. `*` matches
  // exactly one label, so `*.ngrok-free.dev` covers any ngrok free domain
  // (they rotate between sessions).
  allowedDevOrigins: [
    "nonchromosomal-unsteadfast-judson.ngrok-free.dev",
    "*.ngrok-free.dev",
  ],
};

export default nextConfig;
