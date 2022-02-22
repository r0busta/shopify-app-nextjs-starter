import { deleteShop } from "lib/shop"
import getShopify from "lib/shopify"
import type { NextApiRequest, NextApiResponse } from "next"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (getShopify().Webhooks.Registry.isWebhookPath("/api/shopify/webhooks/uninstall")) {
        try {
            await getShopify().Webhooks.Registry.process(req, res)
        } catch (error) {
            console.error(error)
        }
    }

    const shopDomainHeader = req.headers["x-shopify-shop-domain"]
    const shop = (Array.isArray(shopDomainHeader) ? shopDomainHeader[0] : shopDomainHeader) || ""
    const ok = await deleteShop(shop)
    if (!ok) {
        console.error(`Failed to delete shop ${shop}`)
    }

    res.status(200).end()
}
