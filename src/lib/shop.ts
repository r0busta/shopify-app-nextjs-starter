import clerk from "@clerk/clerk-sdk-node"
import ioredis from "ioredis"
import { parseJwt } from "./token"
import getShopify from "./shopify"

const host = process.env.UPSTASH_REDIS_ENDPOINT || ""
const port = process.env.UPSTASH_REDIS_PORT || ""
const password = process.env.UPSTASH_REDIS_PASSWORD || ""

class ShopUsersStorage {
    private client: ioredis.Redis
    private keyPrefix: string = "User.Shops"

    constructor() {
        this.client = new ioredis(`rediss://:${password}@${host}:${port}`)
        this.client.on("error", (err) => {
            throw err
        })
    }

    async add(shop: string, userId: string): Promise<boolean> {
        return this.client.sadd(this.key(shop), userId).then(
            (n) => n === 1,
            (e) => {
                console.error(e)
                return false
            }
        )
    }

    list(shop: string): Promise<string[] | undefined> {
        return this.client.smembers(this.key(shop)).then(
            (v) => v,
            (e) => {
                console.error(e)
                return undefined
            }
        )
    }

    delete(shop: string): Promise<boolean> {
        return this.client.del(this.key(shop)).then(
            (n) => n === 1,
            (e) => {
                console.error(e)
                return false
            }
        )
    }

    deleteUser(shop: string, userId: string): Promise<boolean> {
        return this.client.srem(this.key(shop), [userId]).then(
            (n) => n === 1,
            (e) => {
                console.error(e)
                return false
            }
        )
    }

    private key(shop: string): string {
        return `${this.keyPrefix}.${shop}`
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

    add(userId: string, shop: string, sessionId: string, expires_in: number): Promise<boolean> {
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

    listByShop(userIds: string[], shop: string): Promise<string[] | undefined> {
        return this.client.mget(userIds.map((id) => this.key(id, shop))).then(
            (v) => v.filter((item) => !!item) as string[],
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

    deleteAll(userIds: string[], shop: string): Promise<boolean> {
        return this.client.del(userIds.map((id) => this.key(id, shop))).then(
            (n) => n === userIds.length,
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
    private shopUsersStorage: ShopUsersStorage
    private shopSessionStorage: ShopSessionStorage

    constructor() {
        this.shopUsersStorage = new ShopUsersStorage()
        this.shopSessionStorage = new ShopSessionStorage()
    }

    async saveSession(userId: string, shop: string, sessionId: string, expires_in: number): Promise<boolean> {
        const ok = await this.shopUsersStorage.add(shop, userId)
        if (!ok) {
            return false
        }

        return this.shopSessionStorage.add(userId, shop, sessionId, expires_in)
    }

    async getToken(userId: string, shop: string): Promise<string | undefined> {
        const sessionId = await this.getShopifySessionId(userId, shop)
        if (!sessionId) {
            console.error("No session found")
            return undefined
        }

        const currentSession = await getShopify().Context.SESSION_STORAGE.loadSession(sessionId)
        if (!currentSession || !currentSession.expires || currentSession.expires.getTime() < Date.now()) {
            console.error("No Shopify session found or session expired")
            return undefined
        }

        return currentSession.accessToken
    }

    async deleteShop(shop: string): Promise<boolean> {
        const userIds = await this.shopUsersStorage.list(shop)
        if (userIds && userIds.length > 0) {
            const sessionIds = await this.shopSessionStorage.listByShop(userIds, shop)

            if (sessionIds && sessionIds.length > 0) {
                for (const sessionId of sessionIds) {
                    await getShopify().Context.SESSION_STORAGE.deleteSession(sessionId)
                }
            }

            await this.shopSessionStorage.deleteAll(userIds, shop)
        }

        return this.shopUsersStorage.delete(shop)
    }

    private async getShopifySessionId(userId: string, shop: string): Promise<string | undefined> {
        const userIds = await this.shopUsersStorage.list(shop)
        if (!userIds || !userIds.includes(userId)) {
            return undefined
        }

        return this.shopSessionStorage.get(userId, shop)
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
    clerkSessionToken: string,
    shop: string,
    shopifySessionId: string,
    expires_in: number | undefined
) {
    let userId: string | undefined
    try {
        const sessionId = parseJwt(clerkSessionToken)?.sid

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

    const ok = await getShopService().saveSession(userId, shop, shopifySessionId, expires_in || 3600)
    if (!ok) {
        throw new Error("Could not save shop")
    }
}

export async function getAccessToken(
    clerkSessionToken: string,
    shop: string
): Promise<[string | undefined, string | undefined, Error | null]> {
    if (clerkSessionToken === "") {
        return [undefined, undefined, new Error("Clerk session token is not set.")]
    }
    if (shop === "") {
        return [undefined, undefined, new Error("Unknown shop domain.")]
    }

    let userId: string | undefined
    try {
        const sessionId = parseJwt(clerkSessionToken)?.sid

        const clerkSession = await clerk.sessions.getSession(sessionId)
        if (clerkSession.userId) {
            userId = clerkSession.userId
        }
    } catch (e) {
        return [undefined, undefined, new Error("Failed to get current session.")]
    }

    if (!userId) {
        return [undefined, undefined, new Error("Failed to get current user.")]
    }

    const accessToken = await getShopService().getToken(userId, shop)
    if (!accessToken) {
        return [undefined, undefined, new Error("Failed to get access token.")]
    }

    return [shop, accessToken, null]
}

export async function deleteShop(shop: string) {
    return getShopService().deleteShop(shop)
}
