/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [{ source: "/", destination: "/distribuidora/", permanent: false }];
  },
};

module.exports = nextConfig;
