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
  try {
    // Insert into recycle bin
    const { error: insertError } = await supabase.from("recycle_bin").insert({
      offer_id: offerId,
      offer_data: offerData,
      deleted_at: new Date().toISOString(),
    });

    if (insertError) throw insertError;

    // Mark as deleted in offers table
    const { error: updateError } = await supabase
      .from("offers")
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .eq("id", offerId);

    if (updateError) throw updateError;
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
 * Permanently delete multiple from recycle bin
 */
export async function permanentlyDeleteMultipleFromRecycleBin(
  recycleIds: string[],
  onProgress?: (current: number, total: number) => void
): Promise<{ successful: number; failed: number }> {
  let successful = 0;
  let failed = 0;
  let deletedCount = 0; // Move to function scope

  console.log(`🗑️ Starting batch deletion of ${recycleIds.length} items`);
  console.log(`🔍 Debug: recycleIds passed to function:`, recycleIds);

  if (recycleIds.length === 0) {
    console.log('❌ No IDs provided for deletion');
    return { successful: 0, failed: 0 };
  }

  try {
    // Step 1: Get all recycle items with their offer_ids
    console.log(`🔍 Step 1: Fetching recycle items...`);
    const { data: recycleItems, error: fetchError } = await supabase
      .from('recycle_bin')
      .select('id, offer_id')
      .in('id', recycleIds);

    console.log(`🔍 Debug: recycleItems fetched:`, recycleItems);
    console.log(`🔍 Debug: fetchError:`, fetchError);

    if (fetchError) {
      console.error('❌ Error fetching recycle items:', fetchError);
      throw new Error(`Failed to fetch recycle items: ${fetchError.message}`);
    }

    if (!recycleItems || recycleItems.length === 0) {
      console.log('❌ No recycle items found for deletion');
      return { successful: 0, failed: recycleIds.length };
    }

    console.log(`✅ Found ${recycleItems.length} recycle items to delete`);

    // Step 2: Delete all corresponding offers first
    const offerIdsToDelete = recycleItems
      .filter(item => item.offer_id)
      .map(item => item.offer_id);

    console.log(`🔍 Debug: offerIds to delete:`, offerIdsToDelete);
    console.log(`🔍 Debug: offerIds types:`, offerIdsToDelete.map(id => typeof id));
    console.log(`🔍 Debug: sample offer_id value:`, offerIdsToDelete[0]);

    // Convert text offer_ids to proper UUID format for comparison
    const cleanedOfferIds = offerIdsToDelete.map(id => {
      // Remove any extra characters and ensure proper UUID format
      const cleaned = id.toString().trim();
      return cleaned;
    });

    if (offerIdsToDelete.length > 0) {
      console.log(`🗑️ Step 2: Deleting ${offerIdsToDelete.length} offers from offers table`);
      console.log(`🔍 Debug: cleaned offer IDs:`, cleanedOfferIds);

      // Try a different approach: delete offers one by one to avoid UUID casting issues
      let deletedCount = 0;
      for (const offerId of cleanedOfferIds) {
        try {
          const { error: singleDeleteError } = await supabase
            .from('offers')
            .delete()
            .eq('id::text', offerId);
            
          if (!singleDeleteError) {
            deletedCount++;
            console.log(`✅ Successfully deleted offer: ${offerId}`);
          } else {
            console.log(`❌ Failed to delete offer ${offerId}:`, singleDeleteError);
          }
        } catch (err) {
          console.log(`❌ Exception deleting offer ${offerId}:`, err);
        }
      }
      
      console.log(`🔍 Debug: Total offers deleted: ${deletedCount}`);

      if (deletedCount === 0) {
        console.error('❌ No offers could be deleted from offers table');
        // Continue with recycle bin deletion anyway since offers might not exist
      }
      console.log(`✅ Offers deletion process completed`);
    }

    // Step 3: Delete all recycle bin items
    console.log(`🗑️ Step 3: Deleting ${recycleIds.length} items from recycle_bin table`);
    const { error: recycleDeleteError } = await supabase
      .from('recycle_bin')
      .delete()
      .in('id', recycleIds);

    console.log(`🔍 Debug: recycleDeleteError:`, recycleDeleteError);

    if (recycleDeleteError) {
      console.error('❌ Error deleting from recycle bin:', recycleDeleteError);
      throw new Error(`Failed to delete from recycle bin: ${recycleDeleteError.message}`);
    }

    console.log(`✅ Successfully deleted recycle items from recycle_bin table`);
    console.log(`🎉 Batch deletion complete for ${recycleIds.length} items`);

    // Verify both offers and recycle bin deletions
    console.log(`🔍 Verification step: Checking actual deletion results...`);
    
    // Check remaining offers
    const { data: remainingOffers } = await supabase
      .from('offers')
      .select('id')
      .in('id', cleanedOfferIds);
    
    const offersActuallyDeleted = cleanedOfferIds.length - (remainingOffers?.length || 0);
    console.log(`🔍 Offers verification: Expected to delete ${cleanedOfferIds.length}, actually deleted ${offersActuallyDeleted}`);
    
    // Check remaining recycle bin items
    const { data: remainingRecycleItems } = await supabase
      .from('recycle_bin')
      .select('id')
      .in('id', recycleIds);
    
    const recycleActuallyDeleted = recycleIds.length - (remainingRecycleItems?.length || 0);
    console.log(`🔍 Recycle bin verification: Expected to delete ${recycleIds.length}, actually deleted ${recycleActuallyDeleted}`);
    
    // Use the minimum of both verifications for final count
    const actualDeleted = Math.min(offersActuallyDeleted, recycleActuallyDeleted);
    successful = actualDeleted;
    failed = recycleIds.length - actualDeleted;
    
    console.log(`🔍 Debug: Final successful count: ${successful}, failed count: ${failed}`);

  } catch (error) {
    console.error("❌ Error in batch deletion:", error);
    failed = recycleIds.length;
    successful = 0;
    console.log(`🔍 Debug: Error - successful count: ${successful}, failed count: ${failed}`);
  }

  // Report progress
  if (onProgress) {
    onProgress(successful + failed, recycleIds.length);
  }

  console.log(`🏁 Final result - successful: ${successful}, failed: ${failed}`);
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
