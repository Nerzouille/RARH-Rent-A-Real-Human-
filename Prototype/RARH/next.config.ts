import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    domains: ['static.usernames.app-backend.toolsforhumanity.com'],
  },
  allowedDevOrigins: ['*.trycloudflare.com'],
  reactStrictMode: false,
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = { ...config.resolve.fallback, 'fs/promises': false, fs: false };
    }

    // Do NOT enable asyncWebAssembly here. idkit-core loads its WASM via fetch()
    // (triggered by new URL("idkit_wasm_bg.wasm", import.meta.url)), not via a static
    // WebAssembly import. Enabling asyncWebAssembly causes webpack to register a
    // built-in default rule for .wasm -> webassembly/async which takes precedence over
    // any custom asset/resource rule and prevents the binary from being emitted.

    // Instruct webpack to treat idkit_wasm_bg.wasm as a plain file asset so it is
    // copied to _next/static/media/ and the generated URL resolves correctly at runtime.
    // The rule must be unshifted (placed before webpack's internal defaults) to win
    // over any existing .wasm handling.
    config.module.rules.unshift({
      test: /idkit_wasm_bg\.wasm$/,
      type: 'asset/resource',
      generator: {
        filename: 'static/media/[name].[contenthash:8][ext]',
      },
    });

    // Ensure /_next/ is the public path so the emitted URL resolves in the browser.
    // Next.js already sets this internally but being explicit prevents mis-matches when
    // the config is merged.
    config.output.publicPath = '/_next/';

    return config;
  },
};

export default nextConfig;
