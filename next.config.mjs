/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { dev, isServer }) => {
    // Optimize webpack configuration
    config.cache = false;
    
    // Return the modified config
    return config;
  },
}

export default nextConfig;
