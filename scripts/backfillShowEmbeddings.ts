/**
 * Backfill script for ShowEmbedding table.
 * 
 * Fetches all shows with their tags, services, and actors, computes deterministic
 * IDF-weighted, mean-centered embeddings, and upserts them into the ShowEmbedding
 * table. Pass --include-users to also rebuild UserEmbedding from the new vectors.
 * 
 * Run with: npx tsx scripts/backfillShowEmbeddings.ts
 * 
 * Requires environment variables (loaded from .env.local):
 * - NEXT_PUBLIC_SUPABASE_URL
 * - SUPABASE_SECRET_KEY (an `sb_secret_...` key, for write access; bypasses RLS)
 *
 * Legacy JWT-based `service_role` keys are disabled on this project, so the old
 * SUPABASE_SERVICE_ROLE_KEY variable is no longer read.
 */

import { config } from "dotenv";
import { resolve } from "path";

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), ".env.local") });

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import {
  computeAllShowEmbeddings,
  upsertShowEmbeddings,
} from "../app/utils/recommendations/buildShowEmbeddings";

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !secretKey) {
    console.error("Missing required environment variables:");
    console.error("- NEXT_PUBLIC_SUPABASE_URL");
    console.error("- SUPABASE_SECRET_KEY");
    process.exit(1);
  }

  if (!secretKey.startsWith("sb_secret_")) {
    console.error(
      "SUPABASE_SECRET_KEY must be a secret API key (sb_secret_...). " +
        "Legacy service_role JWTs and publishable keys won't work. " +
        "Create one under Project Settings > API Keys in the Supabase dashboard."
    );
    process.exit(1);
  }

  // Create Supabase client with the secret key for write access
  const supabase = createClient(supabaseUrl, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  console.log("Starting ShowEmbedding backfill...");

  // Fetch all shows and compute IDF-weighted, mean-centered embeddings
  console.log("Fetching shows and computing embeddings...");
  const embeddings = await computeAllShowEmbeddings(supabase);

  if (embeddings.length === 0) {
    console.log("No shows found.");
    process.exit(0);
  }

  console.log(`Computed ${embeddings.length} embeddings. Upserting...`);
  const { success: successCount, failed: errorCount } = await upsertShowEmbeddings(
    supabase,
    embeddings
  );

  console.log("\nBackfill complete!");
  console.log(`- Success: ${successCount}`);
  console.log(`- Errors: ${errorCount}`);

  // Optionally, also backfill user embeddings
  if (process.argv.includes("--include-users")) {
    console.log("\nBackfilling user embeddings...");
    await backfillUserEmbeddings(supabase);
  }
}

async function backfillUserEmbeddings(supabase: SupabaseClient) {
  // Get all users who have at least one rating
  const { data: users, error: usersError } = await supabase
    .from("UserShowDetails")
    .select("userId")
    .not("rating", "is", null);

  if (usersError) {
    console.error("Error fetching users with ratings:", usersError);
    return;
  }

  // Get unique user IDs
  const uniqueUserIds = Array.from(new Set(users?.map((u) => u.userId) || []));
  console.log(`Found ${uniqueUserIds.length} users with ratings.`);

  let successCount = 0;
  let errorCount = 0;

  for (const userId of uniqueUserIds) {
    const { error: rpcError } = await supabase.rpc("refresh_user_embedding", {
      p_user_id: userId,
    });

    if (rpcError) {
      console.error(`Error refreshing embedding for user ${userId}:`, rpcError);
      errorCount++;
    } else {
      successCount++;
    }

    // Progress update every 50 users
    if ((successCount + errorCount) % 50 === 0) {
      console.log(`Progress: ${successCount + errorCount}/${uniqueUserIds.length}`);
    }
  }

  console.log("\nUser embedding backfill complete!");
  console.log(`- Success: ${successCount}`);
  console.log(`- Errors: ${errorCount}`);
}

main().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});

