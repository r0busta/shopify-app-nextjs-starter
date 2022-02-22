import axios, { AxiosResponse } from "axios"
import type { NextPage } from "next"
import { useEffect, useState } from "react"
import { ApolloClient, InMemoryCache, gql } from "@apollo/client"
import { UserButton, useUser } from "@clerk/nextjs"

const Home: NextPage = () => {
    const { firstName } = useUser()

    const [shop, setShop] = useState<string>("")

    const [waitForAuth, setWaitForAuth] = useState<boolean>(false)
    const [shopAuth, setShopAuth] = useState<Map<string, boolean>>(new Map())

    const [products, setProducts] = useState<any>()

    const onCheckAuthClick = async () => {
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
                .then(
                    (res) => {
                        setShopAuth((prev) => {
                            const newMap = new Map(prev)
                            newMap.set(shop, true)
                            return newMap
                        })
                    },
                    (e) => {
                        setShopAuth((prev) => {
                            const newMap = new Map(prev)
                            newMap.set(shop, false)
                            return newMap
                        })
                    }
                )
                .catch(null)
        } catch (e) {}
    }

    const onShopifyAuthClick = async () => {
        if (shop === "") {
            alert("Please enter a shop domain")
        }

        await axios
            .post("/api/shopify/auth/verify", null, {
                headers: {
                    "x-shopify-shop-domain": shop,
                },
            })
            .then((res) => {
                console.log("verify", res)
                setShopAuth((prev) => {
                    const newMap = new Map(prev)
                    newMap.set(shop, true)
                    return newMap
                })
            })
            .catch((e) => {
                if (e.response.status === 401) {
                    console.log("Need Shopify install or re-auth")
                    setWaitForAuth(true)
                    window.open(
                        `/api/shopify/auth/login?shop=${shop}`,
                        "_blank",
                        "location=yes,resizable=yes,statusbar=yes,toolbar=no,width=500,height=600"
                    )
                } else {
                    alert(`Error authenticating: ${e.response.status}`)
                }
            })
    }

    const onLoadAdminProducts = async (key: string) => {
        const client = new ApolloClient({
            uri: `/api/shopify/admin`,
            cache: new InMemoryCache(),
            headers: {
                "x-shopify-shop-domain": key,
            },
        })

        setProducts(null)
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
            .then((result) => setProducts(result.data))
    }

    useEffect(() => {
        console.log("waitForAuth", waitForAuth)
        if (waitForAuth) {
            const id = setInterval(() => {
                axios
                    .post("/api/shopify/auth/verify", null, {
                        headers: {
                            "x-shopify-shop-domain": shop,
                        },
                    })
                    .then(
                        (res) => {
                            console.log("verify", res)
                            setWaitForAuth(false)
                            setShopAuth((prev) => {
                                const newMap = new Map(prev)
                                newMap.set(shop, true)
                                return newMap
                            })
                        },
                        (e) => undefined
                    )
            }, 500)

            return () => clearInterval(id)
        }
    }, [waitForAuth])

    return (
        <>
            <div>
                <header>
                    <UserButton />
                </header>
                <main>Hello, {firstName}!</main>
            </div>
            <div>
                <input type="text" onChange={(e) => setShop(e.target.value)} value={shop} placeholder="Shop domain" />
            </div>
            <div>
                <button onClick={() => onCheckAuthClick()}>Check auth</button>
            </div>
            <div>
                {waitForAuth ? (
                    <span>Installing...</span>
                ) : (
                    <button onClick={() => onShopifyAuthClick()}>Sign in with Shopify</button>
                )}
            </div>
            <div>
                {Array.from(shopAuth.keys()).map((key) => (
                    <div key={key}>
                        <h3>{key}</h3>
                        {shopAuth.get(key) ? (
                            <button onClick={() => onLoadAdminProducts(key)}>Load 10 products in admin mode</button>
                        ) : (
                            "The app is not yet installed or not authenticated"
                        )}
                    </div>
                ))}
            </div>
            <div>
                {products &&
                    products.products.edges.map((edge: any) => (
                        <div key={edge.node.id}>
                            <h3>{edge.node.title}</h3>
                            <p>{edge.node.handle}</p>
                        </div>
                    ))}
            </div>
        </>
    )
}

export default Home
