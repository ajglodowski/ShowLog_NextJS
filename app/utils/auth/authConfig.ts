// Safe to import from client components: no server-only imports here.

// Sign-in is Better Auth, served by the ShowLog API Worker under /api/auth (ShowLog_API/src/betterAuth.ts).
// Its session cookie is set on .showlog.tv, so this server can read it and the browser sends it to
// api.showlog.tv. For local development, run the Worker with `wrangler dev` and set this to
// http://localhost:8787: cookies are shared across localhost ports.
export const showlogApiURL = process.env.NEXT_PUBLIC_SHOWLOG_API_URL ?? "https://api.showlog.tv";

export type SocialProvider = "google" | "apple";
