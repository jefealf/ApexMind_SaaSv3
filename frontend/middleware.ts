import { authMiddleware } from "@clerk/nextjs";

// Clerk v4 Middleware
// Protects all routes by default.
// Explicitly listing public routes.
export default authMiddleware({
    publicRoutes: [
        "/",
        "/sign-in(.*)",
        "/sign-up(.*)",
        "/api/webhooks(.*)" // Often needed for webhooks
    ],
    ignoredRoutes: [
        "/((?!api|trpc))(_next.*|.+\\.[\\w]+$)", // Ignore static files
    ]
});

export const config = {
    matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
