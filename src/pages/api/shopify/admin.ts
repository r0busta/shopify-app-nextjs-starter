import { requireShopifyAdminApiRoute } from "next-shopify-public-app/next"

export const config = {
    api: {
        bodyParser: false,
    },
}

export default requireShopifyAdminApiRoute()
