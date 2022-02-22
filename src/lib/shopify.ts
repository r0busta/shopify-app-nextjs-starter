import ioredis from "ioredis"
import Shopify, { ApiVersion, ContextParams, SessionInterface } from "@shopify/shopify-api"
import { Session, SessionStorage } from "@shopify/shopify-api/dist/auth/session"

const host = process.env.UPSTASH_REDIS_ENDPOINT || ""
const port = process.env.UPSTASH_REDIS_PORT || ""
const password = process.env.UPSTASH_REDIS_PASSWORD || ""

class RedisSessionStorage implements SessionStorage {
    private client: ioredis.Redis
    private keyPrefix: string = "Shopify.Session"

    constructor() {
        this.client = new ioredis(`rediss://:${password}@${host}:${port}`)
        this.client.on("error", function (err) {
            throw err
        })
    }

    storeSession(session: SessionInterface): Promise<boolean> {
        return this.client
            .set(this.key(session.id), JSON.stringify(session), "EX", session.onlineAccessInfo?.expires_in || 3600)
            .then(
                (v) => !!v,
                (e) => {
                    console.error(e)
                    return false
                }
            )
    }

    loadSession(id: string): Promise<SessionInterface | undefined> {
        return this.client.get(this.key(id)).then(
            (v) => {
                if (!v) return undefined
                return this.parse(v)
            },
            (e) => {
                console.error(e)
                return undefined
            }
        )
    }

    deleteSession(id: string): Promise<boolean> {
        return this.client.del(this.key(id)).then(
            (n) => n === 1,
            (e) => {
                console.error(e)
                return false
            }
        )
    }

    private parse(v: string | null): SessionInterface | undefined {
        if (!v) return

        try {
            const obj = JSON.parse(v)

            let res: Session = { ...obj }
            res.expires = new Date(obj.expires)

            return res
        } catch (e: any) {
            console.error(e)
            return
        }
    }

    private key(id: string): string {
        return `${this.keyPrefix}.${id}`
    }
}

const context: ContextParams = {
    IS_EMBEDDED_APP: false,
    API_KEY: process.env.SHOPIFY_APP_API_KEY || "",
    API_SECRET_KEY: process.env.SHOPIFY_APP_API_SECRET_KEY || "",
    SCOPES: [process.env.SCOPES || ""],
    HOST_NAME: process.env.HOST || "",
    API_VERSION: ApiVersion.Unstable,
    SESSION_STORAGE: new RedisSessionStorage(),
}

Shopify.Context.initialize(context)

export default function getShopify() {
    return Shopify
}
