import type { NextApiRequest, NextApiResponse } from "next"
import { getAccessToken } from "lib/shop"

export type TokenResponse = {
    success: boolean
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<TokenResponse>) {
    const clerkSessionToken = req.cookies["__session"]
    const shopDomainHeader = req.headers["x-shopify-shop-domain"]
    const [shop, accessToken, err] = await getAccessToken(
        clerkSessionToken,
        (Array.isArray(shopDomainHeader) ? shopDomainHeader[0] : shopDomainHeader) || ""
    )

    if (err || !shop || !accessToken) {
        res.status(401).json({ success: false })
        return
    }

    res.status(200).json({ success: true })
}
