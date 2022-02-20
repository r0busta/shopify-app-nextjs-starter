import type { AppProps } from "next/app"
import { ClerkProvider, RedirectToSignIn, SignedIn, SignedOut } from "@clerk/nextjs"

function MyApp({ Component, pageProps }: AppProps) {
    return (
        <ClerkProvider>
            <SignedIn>
                <Component {...pageProps} />
            </SignedIn>
            <SignedOut>
                <RedirectToSignIn />
            </SignedOut>
        </ClerkProvider>
    )
}

export default MyApp
