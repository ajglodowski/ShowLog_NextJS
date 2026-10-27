'use server';

import * as Backend from "@/app/utils/backend/BackendService";
import { redirect } from "next/navigation";
import { getCurrentUserId } from "./server";

// The username rules POST /account enforces (ShowLog_API/src/routes/account.ts).
const USERNAME = /^[A-Za-z0-9_.]{3,30}$/;

const backToSignup = (message: string) => redirect(`/signup?message=${encodeURIComponent(message)}`);

/**
 * Creates the signed-in user's profile: the second half of a first sign-in, once they've picked a
 * username. Always through the ShowLog API, whatever useBackendService says: sessions are Better
 * Auth's, which Supabase can't see.
 */
export async function createProfile(formData: FormData) {
    if (!(await getCurrentUserId())) return redirect("/login");

    const username = String(formData.get("username") ?? "").trim();
    const name = String(formData.get("name") ?? "").trim();
    if (!USERNAME.test(username)) {
        return backToSignup("Usernames are 3–30 letters, numbers, underscores or periods");
    }
    if ((await Backend.isUsernameAvailable(username)) === false) {
        return backToSignup("Username already taken");
    }

    const { error } = await Backend.createAccount({ username, name: name || null });
    if (error) return backToSignup(error);
    return redirect("/");
}
