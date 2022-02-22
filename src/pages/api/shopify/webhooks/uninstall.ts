import Shopify from "@shopify/shopify-api"
import { deleteShop } from "lib/shop"
import type { NextApiRequest, NextApiResponse } from "next"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (Shopify.Webhooks.Registry.isWebhookPath("/api/shopify/webhooks/uninstall")) {
        try {
            await Shopify.Webhooks.Registry.process(req, res)
        } catch (error) {
            console.log(error)
        }
    }

    const shopDomainHeader = req.headers["x-shopify-shop-domain"]
    const shop = (Array.isArray(shopDomainHeader) ? shopDomainHeader[0] : shopDomainHeader) || ""
    await deleteShop(shop)

    res.status(200)
}
