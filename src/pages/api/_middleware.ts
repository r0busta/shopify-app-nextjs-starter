import { NextResponse } from "next/server"
import { withEdgeMiddlewareAuth } from "@clerk/nextjs/edge-middleware"

const uninstallPath = "/api/shopify/webhook/uninstall"

export function isWebhookPath(path: string) {
    return path === uninstallPath
}

async function clerkSessionHandler(req: any) {
    const { sessionId } = req.auth

    if (!sessionId) {
        return new Response("Forbidden", { status: 403 })
    }

    return NextResponse.next()
}

export default withEdgeMiddlewareAuth(async (req) => {
    if (isWebhookPath(req.nextUrl.pathname)) {
        return NextResponse.next()
    }

    return clerkSessionHandler(req)
})
