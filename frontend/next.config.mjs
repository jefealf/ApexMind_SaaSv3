const nextConfig = {
    // Forced clean config for stability
    async rewrites() {
        return [
            {
                source: '/frontend/:path*',
                destination: '/:path*',
            },
        ];
    },
};

export default nextConfig;
