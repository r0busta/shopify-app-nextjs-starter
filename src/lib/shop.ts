import type { NextApiRequest, NextApiResponse } from "next"
import clerk from "@clerk/clerk-sdk-node"
import Shopify from "@shopify/shopify-api"
import ioredis from "ioredis"
import { parseJwt } from "./token"

const host = process.env.UPSTASH_REDIS_ENDPOINT || ""
const port = process.env.UPSTASH_REDIS_PORT || ""
const password = process.env.UPSTASH_REDIS_PASSWORD || ""

class UserShopsStorage {
    private client: ioredis.Redis
    private keyPrefix: string = "User.Shops"

    constructor() {
        this.client = new ioredis(`rediss://:${password}@${host}:${port}`)
        this.client.on("error", (err) => {
            throw err
        })
    }

    async add(userId: string, shop: string): Promise<boolean> {
        const curShops = await this.list(userId)
        let shops = []
        if (!curShops) {
            shops = [shop]
        } else if (!curShops.includes(shop)) {
            shops = [...curShops, shop]
        } else {
            return true
        }

        return this.client.set(this.key(userId), JSON.stringify(shops)).then(
            (v) => !!v,
            (e) => {
                console.error(e)
                return false
            }
        )
    }

    list(userId: string): Promise<string[] | undefined> {
        return this.client.get(this.key(userId)).then(
            (v) => {
                if (!v) return undefined
                return JSON.parse(v)
            },
            (e) => {
                console.error(e)
                return undefined
            }
        )
    }

    delete(userId: string): Promise<boolean> {
        return this.client.del(this.key(userId)).then(
            (n) => n === 1,
            (e) => {
                console.error(e)
                return false
            }
        )
    }

    private key(id: string): string {
        return `${this.keyPrefix}.${id}`
    }
}

class ShopSessionStorage {
    private client: ioredis.Redis
    private keyPrefix: string = "User.ShopSessions"

    constructor() {
        this.client = new ioredis(`rediss://:${password}@${host}:${port}`)
        this.client.on("error", (err) => {
            throw err
        })
    }

    async add(userId: string, shop: string, sessionId: string, expires_in: number): Promise<boolean> {
        return this.client.set(this.key(userId, shop), sessionId, "EX", expires_in).then(
            (v) => !!v,
            (e) => {
                console.error(e)
                return false
            }
        )
    }

    get(userId: string, shop: string): Promise<string | undefined> {
        return this.client.get(this.key(userId, shop)).then(
            (v) => {
                if (!v) return undefined
                return v
            },
            (e) => {
                console.error(e)
                return undefined
            }
        )
    }

    delete(userId: string, shop: string): Promise<boolean> {
        return this.client.del(this.key(userId, shop)).then(
            (n) => n === 1,
            (e) => {
                console.error(e)
                return false
            }
        )
    }

    private key(id: string, shop: string): string {
        return `${this.keyPrefix}.${id}.${shop}`
    }
}

class ShopService {
    private userShopsStorage: UserShopsStorage
    private shopSessionStorage: ShopSessionStorage

    constructor() {
        this.userShopsStorage = new UserShopsStorage()
        this.shopSessionStorage = new ShopSessionStorage()
    }

    public async save(userId: string, shop: string, sessionId: string, expires_in: number): Promise<boolean> {
        const ok = await this.userShopsStorage.add(userId, shop)
        if (!ok) {
            return false
        }

        return this.shopSessionStorage.add(userId, shop, sessionId, expires_in)
    }

    private async getShopifySessionId(userId: string, shop: string): Promise<string | undefined> {
        const shops = await this.userShopsStorage.list(userId)
        if (!shops || !shops.includes(shop)) {
            return undefined
        }

        return this.shopSessionStorage.get(userId, shop)
    }

    public async getToken(userId: string, shop: string): Promise<string | undefined> {
        const sessionId = await this.getShopifySessionId(userId, shop)
        if (!sessionId) {
            return undefined
        }

        const currentSession = await Shopify.Context.SESSION_STORAGE.loadSession(sessionId)
        if (!currentSession || !currentSession.expires || currentSession.expires.getTime() < Date.now()) {
            return undefined
        }

        return currentSession.accessToken
    }
}

let _shopService: ShopService
function getShopService() {
    if (!_shopService) {
        _shopService = new ShopService()
    }

    return _shopService
}

export async function saveShopifySessionInfo(
    req: NextApiRequest,
    res: NextApiResponse,
    shop: string,
    shopifySessionId: string,
    expires_in: number | undefined
) {
    let userId: string | undefined
    try {
        const sessionToken = req.cookies["__session"]
        const sessionId = parseJwt(sessionToken)?.sid

        const clerkSession = await clerk.sessions.getSession(sessionId)
        if (clerkSession.userId) {
            userId = clerkSession.userId
        }
    } catch (e) {
        console.error(e)
        throw e
    }

    if (!userId) {
        throw new Error("Could not find userId")
    }

    const ok = await getShopService().save(userId, shop, shopifySessionId, expires_in || 3600)
    if (!ok) {
        throw new Error("Could not save shop")
    }
}

export async function getAccessToken(
    req: NextApiRequest,
    res: NextApiResponse
): Promise<[string | undefined, string | undefined]> {
    let userId: string | undefined
    try {
        const sessionToken = req.cookies["__session"]
        const sessionId = parseJwt(sessionToken)?.sid

        const clerkSession = await clerk.sessions.getSession(sessionId)
        if (clerkSession.userId) {
            userId = clerkSession.userId
        }
    } catch (e) {
        res.status(401)
        res.end("Failed to get current session.")
        return [undefined, undefined]
    }

    if (!userId) {
        res.status(401)
        res.end("Failed to get current user.")
        return [undefined, undefined]
    }

    const xShopifyShopDomainHeader = req.headers["x-shopify-shop-domain"]
    const shop =
        (Array.isArray(xShopifyShopDomainHeader) ? xShopifyShopDomainHeader[0] : xShopifyShopDomainHeader) || ""
    if (shop === "") {
        res.status(400)
        res.end("Unknown shop domain.")
    }

    const accessToken = await getShopService().getToken(userId, shop)
    if (!accessToken) {
        res.status(401)
        res.end("Failed to get Shopify session.")
        return [undefined, undefined]
    }

    return [shop, accessToken]
}
