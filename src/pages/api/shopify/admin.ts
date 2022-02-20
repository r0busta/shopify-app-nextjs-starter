import { NextApiRequest, NextApiResponse } from "next/types"
import { ApolloServer } from "apollo-server-micro"
import { GraphQLSchema, print } from "graphql"
import { wrapSchema, introspectSchema } from "@graphql-tools/wrap"
import { getAccessToken } from "lib/shop"

const createSchema = async (shop: string, accessToken: string): Promise<GraphQLSchema> => {
    const serverExecutor = async ({ document, variables }: any) => {
        const query = print(document)

        const apiVersion = "unstable"
        const uri = `https://${shop}/admin/api/${apiVersion}/graphql.json`
        return fetch(uri, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Shopify-Access-Token": accessToken || "",
            },
            body: JSON.stringify({ query, variables }),
        }).then(
            async (r) => r.json(),
            (e) => {
                console.log(`Executor: couldn't obtain schema from ${uri}`, e)
                return e
            }
        )
    }

    const getServerSchema = async (): Promise<GraphQLSchema> => {
        const schema = await introspectSchema(serverExecutor)
        return wrapSchema({
            schema: schema,
            executor: serverExecutor,
        })
    }

    return getServerSchema()
}

const createServer = (schema: GraphQLSchema) => {
    return new ApolloServer({
        schema: schema,
    })
}

export const config = {
    api: {
        bodyParser: false,
    },
}

let server: ApolloServer | undefined

export default async function handler(req: NextApiRequest, res: NextApiResponse<any>) {
    const [shop, accessToken] = await getAccessToken(req, res)

    if (!shop || !accessToken) {
        res.status(401)
        res.end("Failed to get Shopify session.")
        return
    }

    if (!server) {
        let schema
        try {
            schema = await createSchema(shop, accessToken)
        } catch (error) {
            console.log(error)
            throw error
        }

        server = createServer(schema)
        await server.start()
    }

    await server.createHandler({
        path: "/api/shopify/admin",
    })(req, res)
}
