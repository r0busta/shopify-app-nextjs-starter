import { authMiddleware } from "@clerk/nextjs"

const uninstallPath = "/api/shopify/webhook/uninstall"

export default authMiddleware({
    publicRoutes: [uninstallPath],
})

export const config = {
    matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
}
