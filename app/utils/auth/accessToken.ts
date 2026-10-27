import { showlogApiURL } from "./authConfig";

// Mints ShowLog API access tokens from a Better Auth session cookie (GET /api/auth/token). Takes
// the Cookie header as a string and imports nothing from next/headers, so the Pages Router API
// routes can use it too; App Router code goes through ./server.ts.

/**
 * Minted tokens, reused across requests until a minute before they expire (they last 15
 * minutes). Minting is a round trip to the API that every signed-in render would otherwise pay.
 * Keyed by the session cookie, so signing out (which deletes it) stops the reuse; a session
 * revoked elsewhere is still honoured here until the token runs out.
 */
const REUSE_MARGIN_MS = 60 * 1000;
const MAX_REUSED_TOKENS = 500;
const mintedTokens = new Map<string, { token: string; reuseUntil: number }>();

export function jwtPayload(token: string): { sub?: string; exp?: number } {
    try {
        return JSON.parse(Buffer.from(token.split(".")[1] ?? "", "base64url").toString());
    } catch {
        return {};
    }
}

/** The `name=value` of the session cookie: "better-auth.session_token", "__Secure-" prefixed over https. */
export function sessionCookie(cookieHeader: string): string | undefined {
    return cookieHeader.split(/;\s*/).find((c) => c.split("=")[0]?.endsWith("better-auth.session_token"));
}

/** An access token for the session in this Cookie header, or null when there's no valid session. */
export async function accessTokenFor(cookieHeader: string): Promise<string | null> {
    const session = sessionCookie(cookieHeader);
    if (!session) return null;
    const reused = mintedTokens.get(session);
    if (reused && Date.now() < reused.reuseUntil) return reused.token;

    try {
        const response = await fetch(new URL("/api/auth/token", showlogApiURL), {
            headers: { cookie: cookieHeader },
            cache: "no-store",
            // A hung API must not hang every signed-in render
            signal: AbortSignal.timeout(5000),
        });
        if (!response.ok) {
            if (response.status !== 401) console.error(`Minting an access token failed: HTTP ${response.status}`);
            return null;
        }
        const { token } = await response.json() as { token?: string };
        if (!token) return null;
        const exp = jwtPayload(token).exp;
        if (exp) {
            if (mintedTokens.size >= MAX_REUSED_TOKENS) mintedTokens.clear();
            mintedTokens.set(session, { token, reuseUntil: exp * 1000 - REUSE_MARGIN_MS });
        }
        return token;
    } catch (error) {
        console.error("Minting an access token failed:", error);
        return null;
    }
}
