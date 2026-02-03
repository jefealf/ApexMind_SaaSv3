import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Clerk v5 Middleware
// Define protected routes explicitly.
// By default, clerkMiddleware does not protect any routes.
// We use the route matcher to enforce auth on specific paths.

const isProtectedRoute = createRouteMatcher([
    "/dashboard(.*)",
    "/analysis(.*)",
    "/api/protected(.*)"
]);

export default clerkMiddleware((auth, req) => {
    if (isProtectedRoute(req)) {
        auth().protect();
    }
});

export const config = {
    matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
