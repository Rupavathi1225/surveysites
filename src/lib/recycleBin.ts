import { supabase } from "@/integrations/supabase/client";

// Test Supabase connection
export async function testSupabaseConnection(): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('recycle_bin')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('❌ Supabase connection test failed:', error);
      return false;
    }
    
    console.log('✅ Supabase connection working, count:', data);
    return true;
  } catch (error) {
    console.error('❌ Supabase connection error:', error);
    return false;
  }
}

/**
 * Move offer to recycle bin (soft delete)
 */
export async function moveToRecycleBin(offerId: string, offerData: any): Promise<void> {
  console.log("🗑️ moveToRecycleBin called with offerId:", offerId);
  
  try {
    // Insert into recycle bin
    const { error: insertError } = await supabase.from("recycle_bin").insert({
      offer_id: offerId,
      offer_data: offerData,
      deleted_at: new Date().toISOString(),
    });

    if (insertError) {
      console.error("❌ Insert to recycle_bin failed:", insertError);
      throw insertError;
    }
    console.log("✅ Inserted to recycle_bin");

    // Mark as deleted in offers table
    const { error: updateError } = await supabase
      .from("offers")
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .eq("id", offerId);

    if (updateError) {
      console.error("❌ Update offers failed:", updateError);
      throw updateError;
    }
    console.log("✅ Updated offers table");
    
    console.log("✅ Successfully moved to recycle bin:", offerId);
  } catch (error) {
    console.error("❌ Error moving to recycle bin:", error);
    throw error;
  }
}

/**
 * Soft delete multiple offers
 */
export async function moveMultipleToRecycleBin(
  offerIds: string[],
  offerDataMap: Map<string, any>,
  onProgress?: (current: number, total: number) => void
): Promise<{ successful: number; failed: number }> {
  let successful = 0;
  let failed = 0;

  try {
    for (let i = 0; i < offerIds.length; i++) {
      const id = offerIds[i];
      try {
        await moveToRecycleBin(id, offerDataMap.get(id));
        successful++;
        
        // Report progress
        if (onProgress) {
          onProgress(i + 1, offerIds.length);
        }
      } catch (error) {
        console.error(`Failed to delete offer ${id}:`, error);
        failed++;
        
        // Still report progress even on failure
        if (onProgress) {
          onProgress(i + 1, offerIds.length);
        }
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
    const { error: recycleUpdateError } = await supabase
      .from("recycle_bin")
      .update({ restored_at: new Date().toISOString() })
      .eq("id", recycleId);

    if (recycleUpdateError) throw recycleUpdateError;

    // Restore in offers table
    const { error: offerUpdateError } = await supabase
      .from("offers")
      .update({ is_deleted: false, deleted_at: null })
      .eq("id", offerId);

    if (offerUpdateError) throw offerUpdateError;
  } catch (error) {
    console.error("Error restoring from recycle bin:", error);
    throw error;
  }
}

/**
 * Restore multiple offers from recycle bin - FAST BULK RESTORE
 */
export async function restoreMultipleFromRecycleBin(
  recycleIds: string[],
  onProgress?: (current: number, total: number) => void
): Promise<{ successful: number; failed: number }> {
  console.log(`🔄 Starting FAST BULK restore of ${recycleIds.length} items`);

  if (recycleIds.length === 0) {
    return { successful: 0, failed: 0 };
  }

  let successful = 0;
  let failed = 0;

  try {
    if (onProgress) onProgress(0, recycleIds.length);

    // Get all recycle items in ONE query
    const { data: recycleItems, error: fetchError } = await supabase
      .from('recycle_bin')
      .select('id, offer_id')
      .in('id', recycleIds);

    if (fetchError) throw new Error(`Failed to fetch recycle items: ${fetchError.message}`);
    if (!recycleItems || recycleItems.length === 0) return { successful: 0, failed: recycleIds.length };

    // Extract all offer_ids
    const offerIdsToRestore = recycleItems
      .filter(item => item.offer_id)
      .map(item => item.offer_id);

    // Bulk restore all offers at once
    if (offerIdsToRestore.length > 0) {
      const { error: offerRestoreError } = await supabase
        .from('offers')
        .update({ 
          is_deleted: false, 
          deleted_at: null 
        })
        .in('id', offerIdsToRestore);

      if (offerRestoreError) {
        console.error("Error restoring offers:", offerRestoreError);
        throw offerRestoreError;
      }
    }

    // Bulk update recycle bin items as restored
    const { error: recycleUpdateError } = await supabase
      .from('recycle_bin')
      .update({ restored_at: new Date().toISOString() })
      .in('id', recycleIds);

    if (recycleUpdateError) {
      console.error("Error updating recycle bin:", recycleUpdateError);
      throw recycleUpdateError;
    }

    successful = recycleItems.length;
    failed = recycleIds.length - recycleItems.length;

    if (onProgress) onProgress(recycleIds.length, recycleIds.length);

  } catch (error) {
    console.error("Error in bulk restore:", error);
    failed = recycleIds.length;
    successful = 0;
  }

  return { successful, failed };
}

/**
 * Permanently delete from recycle bin
 */
export async function permanentlyDeleteFromRecycleBin(recycleId: string): Promise<void> {
  console.log(`🗑️ Starting permanent deletion for recycle item: ${recycleId}`);

  try {
    // Step 1: Get offer_id from recycle bin
    const { data: recycleItem, error: fetchError } = await supabase
      .from('recycle_bin')
      .select('offer_id')
      .eq('id', recycleId)
      .single();

    if (fetchError) {
      console.error('❌ Error fetching recycle item:', fetchError);
      throw new Error(`Failed to fetch recycle item: ${fetchError.message}`);
    }

    if (!recycleItem) {
      console.error('❌ Recycle item not found:', recycleId);
      throw new Error('Recycle item not found');
    }

    console.log(`✅ Found recycle item with offer_id: ${recycleItem.offer_id}`);

    // Step 2: Delete from offers table first
    if (recycleItem.offer_id) {
      console.log(`🗑️ Step 2: Deleting offer ${recycleItem.offer_id} from offers table`);
      const { error: offerDeleteError } = await supabase
        .from('offers')
        .delete()
        .eq('id', recycleItem.offer_id);

      if (offerDeleteError) {
        console.error('❌ Error deleting from offers table:', offerDeleteError);
        throw new Error(`Failed to delete from offers table: ${offerDeleteError.message}`);
      }
      console.log(`✅ Successfully deleted offer ${recycleItem.offer_id} from offers table`);
    }

    // Step 3: Delete from recycle bin
    console.log(`🗑️ Step 3: Deleting recycle item ${recycleId} from recycle_bin table`);
    const { error: recycleDeleteError } = await supabase
      .from('recycle_bin')
      .delete()
      .eq('id', recycleId);

    if (recycleDeleteError) {
      console.error('❌ Error deleting from recycle bin:', recycleDeleteError);
      throw new Error(`Failed to delete from recycle bin: ${recycleDeleteError.message}`);
    }

    console.log(`✅ Successfully deleted recycle item ${recycleId} from recycle_bin table`);
    console.log(`🎉 Permanent deletion complete for ${recycleId}`);

  } catch (error) {
    console.error("❌ Error permanently deleting from recycle bin:", error);
    throw error;
  }
}

/**
 * Permanently delete multiple from recycle bin - FAST BULK DELETE
 */
export async function permanentlyDeleteMultipleFromRecycleBin(
  recycleIds: string[],
  onProgress?: (current: number, total: number) => void
): Promise<{ successful: number; failed: number }> {
  console.log(`🗑️ Starting FAST BULK deletion of ${recycleIds.length} items`);

  if (recycleIds.length === 0) {
    return { successful: 0, failed: 0 };
  }

  let successful = 0;
  let failed = 0;

  try {
    if (onProgress) onProgress(0, recycleIds.length);

    // Get all recycle items in ONE query
    const { data: recycleItems, error: fetchError } = await supabase
      .from('recycle_bin')
      .select('id, offer_id')
      .in('id', recycleIds);

    if (fetchError) throw new Error(`Failed to fetch recycle items: ${fetchError.message}`);
    if (!recycleItems || recycleItems.length === 0) return { successful: 0, failed: recycleIds.length };

    // Extract all offer_ids
    const offerIdsToDelete = recycleItems
      .filter(item => item.offer_id)
      .map(item => item.offer_id);

    // Bulk delete all offers at once
    if (offerIdsToDelete.length > 0) {
      await supabase.from('offers').delete().in('id', offerIdsToDelete);
    }

    // Bulk delete all recycle bin items at once
    await supabase.from('recycle_bin').delete().in('id', recycleIds);

    successful = recycleItems.length;
    failed = recycleIds.length - recycleItems.length;

    if (onProgress) onProgress(recycleIds.length, recycleIds.length);

  } catch (error) {
    console.error("Error in bulk deletion:", error);
    failed = recycleIds.length;
    successful = 0;
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
      .select("id, offer_id")
      .lt("expires_at", new Date().toISOString());

    if (error) throw error;

    if (data && data.length > 0) {
      // First delete from offers table
      const offerIds = data
        .filter((item: any) => item.offer_id)
        .map((item: any) => item.offer_id);
      
      if (offerIds.length > 0) {
        const { error: offerDeleteError } = await supabase
          .from("offers")
          .delete()
          .in("id", offerIds);

        if (offerDeleteError) throw offerDeleteError;
      }

      // Then delete from recycle bin
      const recycleIds = data
        .filter((item: any) => item.id)
        .map((item: any) => item.id);
      
      const { error: deleteError } = await supabase
        .from("recycle_bin")
        .delete()
        .in("id", recycleIds);

      if (deleteError) throw deleteError;
      return data.length;
    }

    return 0;
  } catch (error) {
    console.error("Error cleaning up recycle bin:", error);
    return 0;
  }
}

/**
 * Diagnostic function to check recycle bin status
 */
export async function diagnoseRecycleBin(): Promise<void> {
  console.log('🔍 Diagnosing recycle bin...');
  
  try {
    // Check total count
    const { count: totalCount, error: countError } = await supabase
      .from("recycle_bin")
      .select("*", { count: "exact", head: true })
      .is("restored_at", null);

    if (countError) {
      console.error('❌ Error getting count:', countError);
      return;
    }

    console.log(`📊 Total items in recycle bin: ${totalCount}`);

    // Check a sample of items
    const { data: sampleItems, error: sampleError } = await supabase
      .from("recycle_bin")
      .select("id, offer_id, deleted_at, expires_at")
      .is("restored_at", null)
      .limit(5);

    if (sampleError) {
      console.error('❌ Error getting sample:', sampleError);
      return;
    }

    console.log('📋 Sample items:', sampleItems);

    // Check if corresponding offers exist
    for (const item of sampleItems) {
      if (item.offer_id) {
        const { data: offer, error: offerError } = await supabase
          .from("offers")
          .select("id, title, is_deleted")
          .eq("id", item.offer_id)
          .single();

        if (offerError) {
          console.error(`❌ Error checking offer ${item.offer_id}:`, offerError);
        } else {
          console.log(`📄 Offer ${item.offer_id} exists:`, !!offer, 'is_deleted:', offer?.is_deleted);
        }
      }
    }

  } catch (error) {
    console.error('❌ Diagnosis error:', error);
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
