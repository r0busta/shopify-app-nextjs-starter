# shopify-app-nextjs-starter

An opinionated Shopify App starter kit based on Next.js

## Getting started

1. Set up [Clerk](https://clerk.dev) and [Upstash](https://upstash.com) accounts and get API keys.
2. In Clerk, enable URL-based session syncing [https://clerk.com/docs/upgrade-guides/url-based-session-syncing] so that third-party cookies can work in the development environment.
3. Set up [ngrok](https://ngrok.com) account and create an HTTP tunnel to the port `3000`.
4. Create a Shopify app in your [Shopify Partner account](https://www.shopify.com/partners).
5. Create a [development store](https://shopify.dev/apps/tools/development-stores#create-a-development-store-to-test-your-app).
6. Run

    ```bash
    yarn dev
    ```

7. Open the `ngrok` URL you've got at the step #2.
8. Sign up/in into your app landing page.
9. Install your app on your development store.
10. Start developing your app.

## Deployment

TBD
