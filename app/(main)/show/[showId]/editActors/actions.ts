'use server';

import { 
  addActorToShow as addActor, 
  removeActorFromShow as removeActor,
  findActorByNameExactCI,
  createActor
} from "@/app/(main)/actor/ActorService";
import { getCurrentUserId } from "@/app/utils/auth/server";
import { isAdmin } from "@/app/utils/userService";
import { revalidatePath } from "next/cache";

// Result type for server actions that return status
export type ActionResult = {
  ok: boolean;
  error?: string;
  message?: string;
};

async function checkIsAdmin(): Promise<boolean> {
  const currentUserId = await getCurrentUserId();
  return await isAdmin(currentUserId);
}

export async function handleRemoveActor(formData: FormData) {
  const actorId = Number(formData.get("actorId"));
  const showId = Number(formData.get("showId"));
  
  if (!actorId || !showId) return;
  
  // Defense-in-depth: verify admin status
  if (!await checkIsAdmin()) return;
  
  await removeActor(actorId, showId);
  revalidatePath(`/show/${showId}/editActors`);
}

export async function handleAddActorToShow(formData: FormData) {
  const actorId = Number(formData.get("actorId"));
  const showId = Number(formData.get("showId"));
  
  if (!actorId || !showId) return;
  
  // Defense-in-depth: verify admin status
  if (!await checkIsAdmin()) return;
  
  await addActor(actorId, showId);
  revalidatePath(`/show/${showId}/editActors`);
}

export async function handleCreateActorAndAddToShow(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const actorName = formData.get("actorName")?.toString() || "";
  const showId = Number(formData.get("showId"));
  
  // Validate inputs
  const trimmedName = actorName.trim();
  if (!trimmedName) {
    return { ok: false, error: "Actor name is required" };
  }
  
  if (!showId) {
    return { ok: false, error: "Show ID is required" };
  }
  
  // Defense-in-depth: verify admin status
  if (!await checkIsAdmin()) {
    return { ok: false, error: "You don't have permission to create actors" };
  }
  
  // Check for duplicate (case-insensitive exact match)
  const existingActor = await findActorByNameExactCI(trimmedName);
  if (existingActor) {
    return { 
      ok: false, 
      error: "Actor already exists — use search to add them." 
    };
  }
  
  // Create the new actor
  const newActor = await createActor(trimmedName);
  if (!newActor) {
    return { ok: false, error: "Failed to create actor" };
  }
  
  // Add the actor to the show
  const added = await addActor(newActor.id, showId);
  if (!added) {
    return { ok: false, error: "Failed to add actor to show" };
  }
  
  revalidatePath(`/show/${showId}/editActors`);
  
  return { 
    ok: true, 
    message: `Created and added "${newActor.name}" to the show` 
  };
}