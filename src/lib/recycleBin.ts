import { supabase } from "@/integrations/supabase/client";

/**
 * Move offer to recycle bin (soft delete)
 */
export async function moveToRecycleBin(offerId: string, offerData: any): Promise<void> {
  try {
    // Insert into recycle bin
    await supabase.from("recycle_bin").insert({
      offer_id: offerId,
      offer_data: offerData,
      deleted_at: new Date().toISOString(),
    });

    // Mark as deleted in offers table
    await supabase
      .from("offers")
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .eq("id", offerId);
  } catch (error) {
    console.error("Error moving to recycle bin:", error);
    throw error;
  }
}

/**
 * Soft delete multiple offers
 */
export async function moveMultipleToRecycleBin(
  offerIds: string[],
  offerDataMap: Map<string, any>
): Promise<{ successful: number; failed: number }> {
  let successful = 0;
  let failed = 0;

  try {
    for (const id of offerIds) {
      try {
        await moveToRecycleBin(id, offerDataMap.get(id));
        successful++;
      } catch (error) {
        console.error(`Failed to delete offer ${id}:`, error);
        failed++;
      }
    }
  } catch (error) {
    console.error("Error in batch delete:", error);
  }

  return { successful, failed };
}

/**
 * Get items from recycle bin
 */
export async function getRecycleBinItems(): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from("recycle_bin")
      .select("*")
      .is("restored_at", null)
      .order("deleted_at", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching recycle bin:", error);
    return [];
  }
}

/**
 * Restore offer from recycle bin
 */
export async function restoreFromRecycleBin(recycleId: string, offerId: string): Promise<void> {
  try {
    // Update recycle bin record
    await supabase
      .from("recycle_bin")
      .update({ restored_at: new Date().toISOString() })
      .eq("id", recycleId);

    // Restore in offers table
    await supabase
      .from("offers")
      .update({ is_deleted: false, deleted_at: null })
      .eq("id", offerId);
  } catch (error) {
    console.error("Error restoring from recycle bin:", error);
    throw error;
  }
}

/**
 * Restore multiple offers from recycle bin
 */
export async function restoreMultipleFromRecycleBin(
  items: Array<{ id: string; offer_id: string }>
): Promise<{ successful: number; failed: number }> {
  let successful = 0;
  let failed = 0;

  for (const item of items) {
    try {
      await restoreFromRecycleBin(item.id, item.offer_id);
      successful++;
    } catch (error) {
      console.error(`Failed to restore ${item.offer_id}:`, error);
      failed++;
    }
  }

  return { successful, failed };
}

/**
 * Permanently delete from recycle bin
 */
export async function permanentlyDeleteFromRecycleBin(recycleId: string): Promise<void> {
  try {
    await supabase.from("recycle_bin").delete().eq("id", recycleId);
  } catch (error) {
    console.error("Error permanently deleting:", error);
    throw error;
  }
}

/**
 * Permanently delete multiple from recycle bin
 */
export async function permanentlyDeleteMultipleFromRecycleBin(
  recycleIds: string[]
): Promise<{ successful: number; failed: number }> {
  let successful = 0;
  let failed = 0;

  for (const id of recycleIds) {
    try {
      await permanentlyDeleteFromRecycleBin(id);
      successful++;
    } catch (error) {
      console.error(`Failed to permanently delete ${id}:`, error);
      failed++;
    }
  }

  return { successful, failed };
}

/**
 * Auto-cleanup expired items (older than 30 days)
 */
export async function cleanupExpiredRecycleBinItems(): Promise<number> {
  try {
    const { data, error } = await supabase
      .from("recycle_bin")
      .select("id")
      .lt("expires_at", new Date().toISOString());

    if (error) throw error;

    if (data && data.length > 0) {
      const ids = data.map((item) => item.id);
      const { error: deleteError } = await supabase
        .from("recycle_bin")
        .delete()
        .in("id", ids);

      if (deleteError) throw deleteError;
      return ids.length;
    }

    return 0;
  } catch (error) {
    console.error("Error cleaning up recycle bin:", error);
    return 0;
  }
}

/**
 * Calculate remaining days for item in recycle bin
 */
export function calculateRemainingDays(deletedAt: string): number {
  const deleted = new Date(deletedAt);
  const expires = new Date(deleted.getTime() + 30 * 24 * 60 * 60 * 1000);
  const now = new Date();
  const diff = expires.getTime() - now.getTime();
  return Math.ceil(diff / (24 * 60 * 60 * 1000));
}
