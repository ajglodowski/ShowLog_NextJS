'use client';

import { signOut, touchSession } from "@/app/utils/auth/authClient";
import { useEffect } from "react";

const TOUCHED_KEY = "showlog.sessionTouchedAt";
const TOUCH_EVERY_MS = 24 * 60 * 60 * 1000;

/**
 * Keeps the 60-day session sliding. The server only reads the cookie and can't hand a refreshed
 * one back to the browser, so once a day the browser asks the API itself.
 */
export function SessionKeepAliveClient() {
    useEffect(() => {
        let last = 0;
        try {
            last = Number(localStorage.getItem(TOUCHED_KEY) ?? 0);
        } catch {
            // Storage blocked: touch every load instead
        }
        if (Date.now() - last < TOUCH_EVERY_MS) return;
        touchSession()
            .then(() => {
                try {
                    localStorage.setItem(TOUCHED_KEY, String(Date.now()));
                } catch {
                    // Storage blocked
                }
            })
            .catch((error) => console.error("Refreshing the session failed:", error));
    }, []);
    return null;
}

export function SignOutButtonClient() {
    const onClick = async () => {
        try {
            await signOut();
        } catch (error) {
            console.error("Signing out failed:", error);
        }
        // A full load, so nothing rendered for the signed-in user survives
        window.location.assign("/login");
    };
    return <button type="button" onClick={onClick} className="w-full text-left">Logout</button>;
}
