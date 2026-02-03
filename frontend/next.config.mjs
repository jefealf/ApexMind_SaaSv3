/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            { protocol: 'https', hostname: 'img.clerk.com' },
            { protocol: 'https', hostname: 'images.clerk.dev' },
        ],
    },
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
