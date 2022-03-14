import { requireAppRoutes } from "nextjs-shopify-public-app/next"

export const config = {
    api: {
        bodyParser: false,
    },
}

export default requireAppRoutes()
