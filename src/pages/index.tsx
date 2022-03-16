import axios from "axios"
import type { GetServerSideProps, NextPage } from "next"
import { useEffect, useState } from "react"
import { ApolloClient, InMemoryCache, gql } from "@apollo/client"
import { UserButton, useUser } from "@clerk/nextjs"
import { listStores } from "nextjs-shopify-public-app/lib"

interface Props {
    stores: string[]
}

const Home: NextPage<Props> = ({ stores }: Props) => {
    const { firstName } = useUser()

    const [store, setStore] = useState<string>("")

    const [waitForAuth, setWaitForAuth] = useState<boolean>(false)
    const [storeAuth, setStoreAuth] = useState<Map<string, boolean>>(new Map())

    const [products, setProducts] = useState<any>()

    const onCheckAuthClick = async () => {
        if (store === "") {
            alert("Please enter a store domain")
        }

        try {
            await axios
                .post("/api/shopify/auth/verify", null, {
                    headers: {
                        "x-shopify-store-domain": store,
                    },
                })
                .then(
                    (res) => {
                        setStoreAuth((prev) => {
                            const newMap = new Map(prev)
                            newMap.set(store, true)
                            return newMap
                        })
                    },
                    (e) => {
                        setStoreAuth((prev) => {
                            const newMap = new Map(prev)
                            newMap.set(store, false)
                            return newMap
                        })
                    }
                )
                .catch(null)
        } catch (e) {}
    }

    const onShopifyAuthClick = async () => {
        if (store === "") {
            alert("Please enter a store domain")
        }

        await axios
            .post("/api/shopify/auth/verify", null, {
                headers: {
                    "x-shopify-store-domain": store,
                },
            })
            .then((res) => {
                setStoreAuth((prev) => {
                    const newMap = new Map(prev)
                    newMap.set(store, true)
                    return newMap
                })
            })
            .catch((e) => {
                if (e.response.status === 401) {
                    console.log("Need Shopify install or re-auth")
                    setWaitForAuth(true)
                    window.open(
                        `/api/shopify/auth/login?store=${store}`,
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
                "x-shopify-store-domain": key,
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
                            "x-shopify-store-domain": store,
                        },
                    })
                    .then(
                        (res) => {
                            setWaitForAuth(false)
                            setStoreAuth((prev) => {
                                const newMap = new Map(prev)
                                newMap.set(store, true)
                                return newMap
                            })
                        },
                        (e) => undefined
                    )
            }, 1000)

            return () => clearInterval(id)
        }
    }, [waitForAuth, store])

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
                <label>Enter a new store domain or select an already installed one to continue</label>
                <div>
                    <input
                        type="text"
                        onChange={(e) => setStore(e.target.value)}
                        value={store}
                        placeholder="Store domain (e.g. mystore.myshopify.com)"
                    />
                </div>
                <div>
                    <select onChange={(e) => setStore(e.target.value)}>
                        <option>Select a store</option>
                        {stores.map((item) => (
                            <option key={item} value={item}>
                                {item}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
            {store && (
                <>
                    <hr />
                    <div>
                        <h3>{store}</h3>
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
                {Array.from(storeAuth.keys()).map((key) => (
                    <div key={key}>
                        <h3>{key}</h3>
                        {storeAuth.get(key) ? (
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
        const stores = await listStores(req.cookies["__session"] || "")
        return { props: { stores } }
    } catch (e) {
        console.error(e)
        return { props: { stores: [] } }
    }
}

export default Home
