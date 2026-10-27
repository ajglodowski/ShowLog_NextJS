// Safe to import from client components: no server-only imports here.

// true: read and write through the ShowLog API (api.showlog.tv, the ShowLog_API Worker).
// false: talk to Supabase directly. Checked at the top of every service function that the API
// replaces, the same switch as BackendConfig.enabled in the iOS app.
export const useBackendService = true;
