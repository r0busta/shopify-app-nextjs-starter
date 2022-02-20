import type { NextApiRequest, NextApiResponse } from "next"
import { AuthQuery } from "@shopify/shopify-api"
import { Session } from "@shopify/shopify-api/dist/auth/session"
import Shopify from "lib/shopify"
import { saveShopifySessionInfo } from "lib/shop"

async function afterAuth(req: NextApiRequest, res: NextApiResponse, currentSession: Session): Promise<string> {
    const { id, onlineAccessInfo, shop } = currentSession
    saveShopifySessionInfo(req, res, shop, id, onlineAccessInfo?.expires_in)

    return "/shopify/auth/success"
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    let redirectUrl = `/?host=${req.query.host}`

    try {
        const query: AuthQuery = req.query as unknown as AuthQuery
        await Shopify.Auth.validateAuthCallback(req, res, query)

        const currentSession = await Shopify.Utils.loadCurrentSession(req, res)
        if (typeof currentSession === "undefined") {
            res.writeHead(500)
            res.end("Failed to load current session.")
            return
        }

        if (typeof afterAuth === "function") {
            redirectUrl = (await afterAuth(req, res, currentSession)) || redirectUrl
        }

        res.writeHead(302, { Location: redirectUrl })
        res.end()
    } catch (e: any) {
        console.log(e)

        res.writeHead(500)
        if (e instanceof Shopify.Errors.ShopifyError) {
            res.end(e.message)
        } else {
            res.end(`Failed to complete OAuth process: ${e.message}`)
        }
    }
}
