import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Clerk v6 Middleware
const isProtectedRoute = createRouteMatcher([
    "/dashboard(.*)",
    "/analysis(.*)",
    "/api/protected(.*)"
]);

export default clerkMiddleware(async (auth, req) => {
    if (isProtectedRoute(req)) {
        const { userId, redirectToSignIn } = await auth();
        if (!userId) {
            return redirectToSignIn();
        }
    }
});

export const config = {
    matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
