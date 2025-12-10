import { createAuthClient } from "better-auth/react"
import { env } from "../env"

export const authClient =  createAuthClient({
    baseURL: env.CLIENT_APP_ORIGIN,
})