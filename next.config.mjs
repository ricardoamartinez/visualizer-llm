const nextConfig = {
    reactStrictMode: true,
    eslint: {
      ignoreDuringBuilds: true,
    },
    typescript: {
      ignoreBuildErrors: true, // Disables TypeScript errors during build
    },
  };
  
  export default nextConfig;
  