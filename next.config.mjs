const nextConfig = {
    async rewrites() {
        return [
            {
                source: '/api/py/:path*',
                destination: 'https://apexmind-saasv3.onrender.com/:path*',
            },
        ];
    },
};

export default nextConfig;
