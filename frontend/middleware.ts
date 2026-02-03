import { authMiddleware } from "@clerk/nextjs";

export default authMiddleware({
    publicRoutes: [
        "/",
        "/sign-in(.*)",
        "/sign-up(.*)",
        "/api/webhooks(.*)",
        "/frontend/(.*)" // Allow Vercel rewritten paths
    ],
    ignoredRoutes: [
        "/((?!api|trpc))(_next.*|.+\\.[\\w]+$)",
    ]
});

export const config = {
    matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
