import type { NextPage } from "next"
import { useEffect } from "react"

const Success: NextPage = () => {
    useEffect(() => {
        window.close()
    }, [])

    return (
        <p>
            Successfully signed in. This window will be closed automatically. You can also close this window manually.
        </p>
    )
}

export default Success
