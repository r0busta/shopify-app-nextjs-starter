import Shopify from "@shopify/shopify-api"

export async function registerUninstallWebhook(shop: string, accessToken: string) {
    const topic = "APP_UNINSTALLED"
    const path = "/api/shopify/webhooks/uninstall"
    const WEBHOOKS_REGISTRY = {
        APP_UNINSTALLED: {
            path,
            webhookHandler: async (topic: string, shop: string, body: string) => {
                console.log(`${topic} handler was executed`)
            },
        },
    }
    Shopify.Webhooks.Registry.addHandlers(WEBHOOKS_REGISTRY)

    const response = await Shopify.Webhooks.Registry.registerAll({ shop, accessToken })

    console.log(JSON.stringify(response))
    if (!response[topic].success) {
        console.log(`Failed to register ${topic} webhook: ${response[topic].result}`)
    } else {
        console.log(`${topic} webhook was successfully registered`)
    }
}
