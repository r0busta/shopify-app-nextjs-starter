import type { NextApiRequest, NextApiResponse } from "next"
import { getAccessToken } from "lib/shop"

export type TokenResponse = {
    success: boolean
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<TokenResponse>) {
    const [shop, accessToken] = await getAccessToken(req, res)

    if (!shop || !accessToken) {
        res.status(401).json({ success: false })
        return
    }

    res.status(200).json({ success: true })
}
