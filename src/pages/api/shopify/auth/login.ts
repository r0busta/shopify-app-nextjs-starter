import Shopify from "lib/shopify"
import type { NextApiRequest, NextApiResponse } from "next"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        const { shop } = req.query
        const authRoute = await Shopify.Auth.beginAuth(req, res, shop as string, "/api/shopify/auth/callback", true)
        res.redirect(authRoute)
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
