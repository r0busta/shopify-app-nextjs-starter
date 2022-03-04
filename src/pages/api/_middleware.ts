import { NextResponse, NextFetchEvent, NextRequest } from "next/server"
import { requireSession } from "@clerk/nextjs/edge"

const uninstallPath = "/api/shopify/webhook/uninstall"

export function isWebhookPath(path: string) {
    return path === uninstallPath
}

function withWebhooks(req: NextRequest, _: NextFetchEvent) {
    if (isWebhookPath(req.nextUrl.pathname)) {
        return NextResponse.next()
    }

    return requireSession(clerkSessionHandler)(req)
}

async function clerkSessionHandler(req: any) {
    try {
        await req.session.verifyWithNetwork()
        return NextResponse.next()
    } catch (error) {
        return new Response("Forbidden", { status: 403 })
    }
}

export default withWebhooks
