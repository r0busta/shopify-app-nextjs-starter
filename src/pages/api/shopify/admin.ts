import { requireShopifyAdminApiRoute } from "next-shopify-public-app"

export const config = {
    api: {
        bodyParser: false,
    },
}

export default requireShopifyAdminApiRoute()
