import { NextApiRequest, NextApiResponse } from "next/types"
import { ApolloServer, AuthenticationError } from "apollo-server-micro"
import { loadSchemaSync } from "@graphql-tools/load"
import { GraphQLFileLoader } from "@graphql-tools/graphql-file-loader"
import { AsyncExecutor } from "@graphql-tools/utils"
import { wrapSchema } from "@graphql-tools/wrap"
import { getAccessToken } from "lib/shop"
import { print } from "graphql"
import { join } from "path"

const adminApiVersion = "unstable"

const adminExecutor: AsyncExecutor = ({ document, variables, context }) => {
    if (!context) {
        throw new Error("No context")
    }

    const { shop, accessToken } = context

    const query = print(document)
    return fetch(`https://${shop}/admin/api/${adminApiVersion}/graphql.json`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": accessToken || "",
        },
        body: JSON.stringify({ query, variables }),
    }).then(
        (r) => r.json(),
        (e) => {
            console.error(e)
            return e
        }
    )
}

const createServer = () => {
    const adminSchema = loadSchemaSync(join(process.cwd(), "src/graphql/shopify/admin/schema.graphqls"), {
        loaders: [new GraphQLFileLoader()],
    })

    const schema = wrapSchema({
        schema: adminSchema,
        executor: adminExecutor,
    })

    return new ApolloServer({
        introspection: false,
        schema,
        context: async ({ req }) => {
            const clerkSessionToken = req.cookies["__session"]
            const shopDomainHeader = req.headers["x-shopify-shop-domain"]
            const [shop, accessToken, err] = await getAccessToken(
                clerkSessionToken,
                (Array.isArray(shopDomainHeader) ? shopDomainHeader[0] : shopDomainHeader) || ""
            )

            if (err || !shop || !accessToken) {
                console.error(err)
                throw new AuthenticationError("Not authenticated")
            }

            return { shop, accessToken }
        },
    })
}
const server: ApolloServer = createServer()
const started = server.start().then(() => true)

export default async function handler(req: NextApiRequest, res: NextApiResponse<any>) {
    await Promise.allSettled([started])
    await server.createHandler({
        path: "/api/shopify/admin",
    })(req, res)
}

export const config = {
    api: {
        bodyParser: false,
    },
}
