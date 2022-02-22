import getShopify from "./shopify"

export async function registerUninstallWebhook(shop: string, accessToken: string) {
    const topic = "APP_UNINSTALLED"
    const path = "/api/shopify/webhooks/uninstall"

    const response = await getShopify().Webhooks.Registry.register({
        topic,
        path,
        shop,
        accessToken,
    })

    if (!response[topic].success) {
        console.error(`Failed to register ${topic} webhook: ${response[topic].result}`)
    } else {
        console.log(`${topic} webhook was successfully registered`)
    }
}
