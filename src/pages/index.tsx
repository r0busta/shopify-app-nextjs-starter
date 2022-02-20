import axios, { AxiosResponse } from "axios"
import type { NextPage } from "next"
import { useState } from "react"
import { ApolloClient, InMemoryCache, gql } from "@apollo/client"
import { UserButton, useUser } from "@clerk/nextjs"

const Home: NextPage = () => {
    const { firstName } = useUser()

    const [shop, setShop] = useState<string>("")

    const onShopifyAuthClick = async () => {
        if (shop === "") {
            alert("Please enter a shop domain")
        }

        try {
            await axios
                .post("/api/shopify/auth/verify", null, {
                    headers: {
                        "x-shopify-shop-domain": shop,
                    },
                })
                .catch(null)
        } catch (e: AxiosResponse | any) {
            if (e.response.status === 401) {
                console.log("Need Shopify auth")
                window.open(
                    `/api/shopify/auth/login?shop=${shop}`,
                    "_blank",
                    "location=yes,resizable=yes,statusbar=yes,toolbar=no,width=500,height=600"
                )
            } else {
                alert(`Error authenticating: ${e.response.status}`)
            }
        }
    }

    const onLoadAdminProducts = async () => {
        if (!shop) {
            alert("Please enter a shop domain")
            return
        }

        const client = new ApolloClient({
            uri: `/api/shopify/admin`,
            cache: new InMemoryCache(),
            headers: {
                "x-shopify-shop-domain": shop,
            },
        })

        client
            .query({
                query: gql`
                    query GetProducts {
                        products(first: 10) {
                            edges {
                                node {
                                    id
                                    handle
                                    title
                                }
                            }
                        }
                    }
                `,
            })
            .then((result) => console.log(result))
    }

    return (
        <>
            <div>
                <header>
                    <UserButton />
                </header>
                <main>Hello, {firstName}!</main>
            </div>
            <div>
                <input type="text" onChange={(e) => setShop(e.target.value)} value={shop} />
            </div>
            <div>
                <button onClick={() => onShopifyAuthClick()}>Sign in with Shopify</button>
            </div>
            <div>
                <button onClick={() => onLoadAdminProducts()}>Load 10 products in admin mode</button>
            </div>
        </>
    )
}

export default Home
