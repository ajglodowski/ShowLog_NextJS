import type { components } from "@/app/models/api";
import { showlogApiURL } from "@/app/utils/auth/authConfig";
import { getAccessToken } from "@/app/utils/auth/server";

// Server only: the token comes from the session cookie, and the API sends no CORS headers, so
// the browser can't call it directly. Client components go through ./actions.ts instead.

/** The API contract, generated from https://api.showlog.tv/openapi.json into app/models/api.d.ts. */
export type API = components["schemas"];

const baseURL = showlogApiURL;

export class BackendError extends Error {
    constructor(readonly status: number, readonly code: string, message: string) {
        super(message);
        this.name = "BackendError";
    }
}

type QueryValue = string | number | boolean | (string | number)[] | null | undefined;

export type BackendRequest = {
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    query?: Record<string, QueryValue>;
    body?: unknown;
    // "user" sends the signed-in user's access token when there is one; signed-out requests go
    // without, so public routes still work and user routes answer 401. "public" never reads
    // cookies, so it can be called inside 'use cache'.
    auth?: "user" | "public";
    // Sends this token instead of the cookie session's
    token?: string;
};

export async function send<T>(path: string, { method = "GET", query, body, auth = "user", token }: BackendRequest = {}): Promise<T> {
    const url = new URL(path, baseURL);
    for (const [key, value] of Object.entries(query ?? {})) {
        if (value === undefined || value === null) continue;
        if (Array.isArray(value)) {
            if (value.length > 0) url.searchParams.set(key, value.join(","));
        } else {
            url.searchParams.set(key, String(value));
        }
    }

    const headers: Record<string, string> = { Accept: "application/json" };
    const bearer = token ?? (auth === "user" ? await getAccessToken() : undefined);
    if (bearer) headers.Authorization = `Bearer ${bearer}`;
    if (body !== undefined) headers["Content-Type"] = "application/json";

    const response = await fetch(url, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        // Caching is decided by the calling service function ('use cache' / React cache)
        cache: "no-store",
    });

    if (!response.ok) {
        // The API's error envelope: { "error": { "code", "message" } }
        const envelope = await response.json().catch(() => null) as API["Error"] | null;
        const code = envelope?.error?.code ?? "http_error";
        const message = envelope?.error?.message ?? `HTTP ${response.status}`;
        throw new BackendError(response.status, code, `ShowLog API ${method} ${url.pathname} ${response.status} ${code}: ${message}`);
    }
    if (response.status === 204) return undefined as T;
    return await response.json() as T;
}

type Page<Item> = { items: Item[]; total: number; page: number; pageSize: number };

/** Walks a paginated route until `limit` items (or everything) has been read. */
export async function allPages<Item>(path: string, request: BackendRequest = {}, limit?: number): Promise<Item[]> {
    const pageSize = 100;
    const pageRequest = (page: number) => send<Page<Item>>(path, { ...request, query: { ...request.query, page, pageSize } });
    const first = await pageRequest(1);
    const wanted = Math.min(first.total, limit ?? first.total);
    const pageCount = Math.ceil(wanted / pageSize);
    // The total is known after the first page, so the rest go out side by side
    const rest = await Promise.all(Array.from({ length: Math.max(0, pageCount - 1) }, (_, i) => pageRequest(i + 2)));
    return [first, ...rest].flatMap((page) => page.items).slice(0, wanted);
}
