import axios from "axios"
import type { GetServerSideProps, NextPage } from "next"
import { useEffect, useState } from "react"
import { ApolloClient, InMemoryCache, gql } from "@apollo/client"
import { UserButton, useUser } from "@clerk/nextjs"
import { listShops } from "nextjs-shopify-public-app/lib"

interface Props {
    shops: string[]
}

const Home: NextPage<Props> = ({ shops }: Props) => {
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
                            setWaitForAuth(false)
                            setShopAuth((prev) => {
                                const newMap = new Map(prev)
                                newMap.set(shop, true)
                                return newMap
                            })
                        },
                        (e) => undefined
                    )
            }, 1000)

            return () => clearInterval(id)
        }
    }, [waitForAuth, shop])

    return (
        <>
            <div>
                <header>
                    <UserButton />
                </header>
                <main>Hello, {firstName}!</main>
            </div>
            <hr />
            <div>
                <label>Enter a new shop domain or select an already installed one to continue</label>
                <div>
                    <input
                        type="text"
                        onChange={(e) => setShop(e.target.value)}
                        value={shop}
                        placeholder="Shop domain (*.myshopify.com)"
                    />
                </div>
                <div>
                    <select onChange={(e) => setShop(e.target.value)}>
                        <option>Select a shop</option>
                        {shops.map((item) => (
                            <option key={item} value={item}>
                                {item}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
            {shop && (
                <>
                    <hr />
                    <div>
                        <h3>{shop}</h3>
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
                    </div>
                </>
            )}
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
                {products && (
                    <>
                        <hr />
                        <h3>Products</h3>
                        <ul>
                            {products.products.edges.map((edge: any) => (
                                <li key={edge.node.id}>
                                    <span>
                                        {edge.node.title} — {edge.node.handle}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </>
                )}
            </div>
        </>
    )
}

export const getServerSideProps: GetServerSideProps = async ({ req, res }) => {
    try {
        const shops = await listShops(req.cookies["__session"] || "")
        return { props: { shops } }
    } catch (e) {
        console.error(e)
        return { props: { shops: [] } }
    }
}

export default Home
