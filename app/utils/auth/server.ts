import { cookies } from "next/headers";
import { cache } from "react";
import { accessTokenFor, jwtPayload, sessionCookie } from "./accessToken";
import { showlogApiURL } from "./authConfig";

// Server side of Better Auth. The session cookie identifies the browser; the ShowLog API wants a
// short-lived access token instead, minted from the cookie by GET /api/auth/token.
//
// Everything here reads cookies, so none of it may be reached from inside 'use cache' (see the
// note on backendClient.ts): cached code keys on a userId passed in from outside.

export type AuthSession = {
    user: { id: string; email: string; name: string; image: string | null };
};

async function cookieHeader(): Promise<string> {
    return (await cookies()).getAll().map((c) => `${c.name}=${c.value}`).join("; ");
}

/** The signed-in user's access token for the ShowLog API, or null when signed out. One mint per request. */
export const getAccessToken = cache(async (): Promise<string | null> => accessTokenFor(await cookieHeader()));

/** The signed-in user's id, or undefined when signed out. */
export const getCurrentUserId = cache(async (): Promise<string | undefined> => {
    const token = await getAccessToken();
    return token ? jwtPayload(token).sub : undefined;
});

/** The Better Auth user (with email), or null when signed out. Costs a request to the API. */
export const getAuthSession = cache(async (): Promise<AuthSession | null> => {
    const header = await cookieHeader();
    if (!sessionCookie(header)) return null;
    try {
        const response = await fetch(new URL("/api/auth/get-session", showlogApiURL), {
            headers: { cookie: header },
            cache: "no-store",
            signal: AbortSignal.timeout(5000),
        });
        if (!response.ok) return null;
        return await response.json() as AuthSession | null;
    } catch (error) {
        console.error("Reading the session failed:", error);
        return null;
    }
});
