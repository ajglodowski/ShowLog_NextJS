'use client';

import { createAuthClient } from "better-auth/client";
import { showlogApiURL, type SocialProvider } from "./authConfig";

// Browser side of Better Auth. These are the only calls the browser makes to the ShowLog API
// directly: /api/auth/* is the one part of it that sends CORS headers.
const authClient = createAuthClient({
    baseURL: showlogApiURL,
    fetchOptions: { credentials: "include" },
});

/** Sends the browser to Google or Apple; it comes back to /auth/finish. */
export async function signInWith(provider: SocialProvider) {
    const origin = window.location.origin;
    const { error } = await authClient.signIn.social({
        provider,
        callbackURL: `${origin}/auth/finish`,
        errorCallbackURL: `${origin}/login?message=${encodeURIComponent("Sign-in didn't go through. Please try again.")}`,
    });
    if (error) throw new Error(error.message ?? "Sign-in failed");
}

export async function signOut() {
    await authClient.signOut();
}

/**
 * Asks the API for the session, which extends it (and re-sets the cookie) once it's a day old.
 * The server side can't pass refreshed cookies on to the browser, so the browser does this.
 */
export async function touchSession() {
    await authClient.getSession();
}
