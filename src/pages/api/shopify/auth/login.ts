import Shopify from "@shopify/shopify-api"
import getShopify from "lib/shopify"
import type { NextApiRequest, NextApiResponse } from "next"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        const { shop } = req.query
        const authRoute = await getShopify().Auth.beginAuth(
            req,
            res,
            shop as string,
            "/api/shopify/auth/callback",
            true
        )
        res.redirect(authRoute)
    } catch (e: any) {
        console.error(e)

        res.writeHead(500)
        if (e instanceof Shopify.Errors.ShopifyError) {
            res.end(e.message)
        } else {
            res.end(`Failed to complete OAuth process: ${e.message}`)
        }
    }
}
