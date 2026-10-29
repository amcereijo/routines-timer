import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */

  // Allow the dev server to be reached through a tunnel (e.g. ngrok).
  // Entries are hostnames only — no scheme, port, or path. A `*` stands
  // in for exactly one label of the hostname, so `*.ngrok-free.dev`
  // covers every ngrok free domain (they rotate between sessions).
  allowedDevOrigins: ["*.ngrok-free.dev"],
};

export default nextConfig;
