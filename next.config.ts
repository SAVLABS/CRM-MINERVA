import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Sin esto Turbopack sube hasta /Users y se come el package-lock.json de tu
  // home, que no debería formar parte del proyecto.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
