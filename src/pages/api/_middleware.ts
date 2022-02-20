import { requireSession } from "@clerk/nextjs/edge"
import { NextResponse } from "next/server"

async function middleware(req: any) {
    try {
        await req.session.verifyWithNetwork()
        return NextResponse.next()
    } catch (error) {
        return new Response("Forbidden", { status: 403 })
    }
}

export default requireSession(middleware)
