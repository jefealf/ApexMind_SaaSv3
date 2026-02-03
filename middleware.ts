import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Standard Clerk v6 Middleware
const isProtectedRoute = createRouteMatcher([
    "/dashboard(.*)",
    "/analysis(.*)",
    "/api/protected(.*)"
]);

export default clerkMiddleware(async (auth, req) => {
    if (isProtectedRoute(req)) {
        (await auth()).protect();
    }
});

export const config = {
    matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
