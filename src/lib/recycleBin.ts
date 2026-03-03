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
    console.log("🗑️ About to update offers table - setting is_deleted=true for offer:", offerId);
    
    try {
      // First attempt: Update with is_deleted flag
      const { error: updateError } = await supabase
        .from("offers")
        .update({ 
          is_deleted: true, 
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("id", offerId);

      if (updateError) {
        console.error("❌ First update attempt failed:", updateError);
        
        // Second attempt: Try with different syntax
        const { error: retryError } = await supabase
          .from("offers")
          .update({ 
            is_deleted: true, 
            deleted_at: new Date().toISOString()
          })
          .eq("id", offerId);

        if (retryError) {
          console.error("❌ Second update attempt failed:", retryError);
          throw retryError;
        } else {
          console.log("✅ Second update attempt succeeded");
        }
      } else {
        console.log("✅ First update attempt succeeded");
      }
    } catch (error) {
      console.error("❌ Update offers failed with exception:", error);
      throw error;
    }
    
    // Always verify the update worked
    console.log("🔍 Verifying update - checking if offer is now marked as deleted");
    let verifyAttempts = 0;
    const maxAttempts = 3;
    
    while (verifyAttempts < maxAttempts) {
      verifyAttempts++;
      console.log(`🔍 Verification attempt ${verifyAttempts}/${maxAttempts}`);
      
      const { data: verifyData, error: verifyError } = await supabase
        .from("offers")
        .select("id, is_deleted, deleted_at, updated_at")
        .eq("id", offerId)
        .single();
        
      if (verifyError) {
        console.error("❌ Verification failed:", verifyError);
        await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms
        continue;
      }
      
      console.log("✅ Verification successful - offer status:", {
        id: verifyData.id,
        is_deleted: verifyData.is_deleted,
        deleted_at: verifyData.deleted_at,
        updated_at: verifyData.updated_at
      });
      
      if (verifyData.is_deleted === true) {
        console.log("✅ CONFIRMED - is_deleted is now true");
        break;
      } else {
        console.error("🚨 CRITICAL ERROR - is_deleted was not set to true! Current value:", verifyData.is_deleted);
        
        // Force update one more time
        if (verifyAttempts < maxAttempts) {
          console.log("🔧 Forcing update - setting is_deleted=true again");
          await supabase
            .from("offers")
            .update({ 
              is_deleted: true, 
              deleted_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq("id", offerId);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        }
      }
    }
    
    console.log("✅ Successfully moved to recycle bin:", offerId);
    
    // Trigger refresh of recycle bin data
    console.log('🔄 Triggering recycle bin refresh after move');
    // Dispatch custom event to notify frontend
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('recycleBinUpdated', { 
        detail: { action: 'item_moved', offerId } 
      }));
    }
    
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
    if (onProgress) onProgress(0, offerIds.length);

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
    console.log('🔍 Fetching recycle bin items with cache busting...');
    
    // Add cache busting with current timestamp
    const cacheBuster = Date.now();
    
    const { data, error } = await supabase
      .from("recycle_bin")
      .select("*")
      .is("restored_at", null)
      .order("deleted_at", { ascending: false })
      .limit(10000); // Ensure we get all items

    console.log('📊 Recycle bin query result:', { 
      itemCount: data?.length || 0, 
      error: error?.message,
      cacheBuster 
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching recycle bin:", error);
    return [];
  }
}

/**
 * Get direct count of recycle bin items (for verification)
 */
export async function getRecycleBinCount(): Promise<number> {
  try {
    console.log('🔢 Getting direct recycle bin count...');
    
    const { count, error } = await supabase
      .from("recycle_bin")
      .select("*", { count: "exact", head: true })
      .is("restored_at", null);

    console.log('📊 Direct count result:', { count, error: error?.message });

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error("Error getting recycle bin count:", error);
    return 0;
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

    // Restore in offers table - set to "pending" status for All Offers section
    const { error: offerUpdateError } = await supabase
      .from("offers")
      .update({ 
        is_deleted: false, 
        deleted_at: null,
        status: "pending"  // Set to pending so it appears in All Offers section
      })
      .eq("id", offerId);

    if (offerUpdateError) throw offerUpdateError;
    
    // Trigger refresh of All Offers data
    console.log('🔄 Triggering All Offers refresh after restore');
    // Dispatch custom event to notify frontend
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('recycleBinUpdated', { 
        detail: { action: 'item_restored', offerId } 
      }));
    }
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
          deleted_at: null,
          status: "pending"  // Set to pending so it appears in All Offers section
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
    
    // Trigger refresh of All Offers data after bulk restore
    console.log('🔄 Triggering All Offers refresh after bulk restore');
    // Dispatch custom event to notify frontend
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('recycleBinUpdated', { 
        detail: { action: 'bulk_restored', count: successful } 
      }));
    }

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
      
      // DEBUG: Check if offer exists before deletion
      const { data: offerCheck, error: checkError } = await supabase
        .from('offers')
        .select('id, title, is_deleted')
        .eq('id', recycleItem.offer_id);
      
      console.log('🔍 PERMANENT DELETE DEBUG - Offer check before deletion:', offerCheck);
      console.log('🔍 PERMANENT DELETE DEBUG - Check error:', checkError);
      
      const { error: offerDeleteError, count: deleteCount } = await supabase
        .from('offers')
        .delete()
        .eq('id', recycleItem.offer_id);

      console.log('🔍 PERMANENT DELETE DEBUG - Delete result:', { error: offerDeleteError, count: deleteCount });

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
    
    // Trigger refresh of All Offers data
    console.log('🔄 Triggering All Offers refresh after permanent deletion');
    // Dispatch custom event to notify frontend
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('recycleBinUpdated', { 
        detail: { action: 'permanent_delete', offerId: recycleId } 
      }));
    }
    
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
  console.log('🔍 BACKEND DEBUG - Input recycleIds:', recycleIds);
  console.log('🔍 BACKEND DEBUG - Input recycleIds types:', recycleIds.map(id => typeof id));

  if (recycleIds.length === 0) {
    return { successful: 0, failed: 0 };
  }

  let successful = 0;
  let failed = 0;

  try {
    if (onProgress) onProgress(0, recycleIds.length);

    // Get all recycle items - BATCHED APPROACH to avoid 400 errors
    const batchSize = 100; // Process in smaller batches
    let allRecycleItems: any[] = [];
    let fetchError: any = null;

    console.log('🔍 BACKEND DEBUG - Processing in batches of', batchSize);

    for (let i = 0; i < recycleIds.length; i += batchSize) {
      const batch = recycleIds.slice(i, i + batchSize);
      console.log(`🔍 BACKEND DEBUG - Processing batch ${Math.floor(i/batchSize) + 1}, IDs:`, batch);
      
      const { data: batchItems, error: batchError } = await supabase
        .from('recycle_bin')
        .select('id, offer_id')
        .in('id', batch);

      if (batchError) {
        console.error(`🔍 BACKEND DEBUG - Batch ${Math.floor(i/batchSize) + 1} error:`, batchError);
        fetchError = batchError;
      } else if (batchItems) {
        allRecycleItems.push(...batchItems);
        console.log(`🔍 BACKEND DEBUG - Batch ${Math.floor(i/batchSize) + 1} found:`, batchItems.length, 'items');
      }
    }

    console.log('🔍 BACKEND DEBUG - Total recycle items found:', allRecycleItems.length);
    
    if (fetchError && allRecycleItems.length === 0) {
      throw new Error(`Failed to fetch recycle items: ${fetchError.message}`);
    }
    if (allRecycleItems.length === 0) {
      console.log('❌ No recycle items found with the provided IDs');
      return { successful: 0, failed: recycleIds.length };
    }

    // Extract all offer_ids
    const offerIdsToDelete = allRecycleItems
      .filter(item => item.offer_id)
      .map(item => item.offer_id);

    console.log('🔍 BACKEND DEBUG - Offer IDs to delete:', offerIdsToDelete);
    console.log('🔍 BACKEND DEBUG - Offer IDs types:', offerIdsToDelete.map(id => typeof id));

    // Bulk delete all offers at once - BATCHED
    if (offerIdsToDelete.length > 0) {
      console.log('🔍 BACKEND DEBUG - Deleting offers from offers table...');
      
      // DEBUG: Check if offers exist before deletion
      const { data: existingOffers, error: checkError } = await supabase
        .from('offers')
        .select('id, title, is_deleted')
        .in('id', offerIdsToDelete);
      
      console.log('🔍 BULK DELETE DEBUG - Offers found before deletion:', existingOffers?.length || 0);
      console.log('🔍 BULK DELETE DEBUG - Check error:', checkError);
      console.log('🔍 BULK DELETE DEBUG - Sample offers:', existingOffers?.slice(0, 3));
      
      // Delete offers in batches too
      const offerBatchSize = 100;
      let totalOfferDeletes = 0;
      let offerDeleteErrors = 0;
      
      for (let i = 0; i < offerIdsToDelete.length; i += offerBatchSize) {
        const offerBatch = offerIdsToDelete.slice(i, i + offerBatchSize);
        console.log(`🔍 BACKEND DEBUG - Deleting offer batch ${Math.floor(i/offerBatchSize) + 1}, count: ${offerBatch.length}`);
        
        const { error: offerDeleteError, count: offerDeleteCount } = await supabase
          .from('offers')
          .delete()
          .in('id', offerBatch);
          
        if (offerDeleteError) {
          console.error(`❌ Offer batch ${Math.floor(i/offerBatchSize) + 1} delete error:`, offerDeleteError);
          offerDeleteErrors++;
        } else {
          console.log(`✅ Offer batch ${Math.floor(i/offerBatchSize) + 1} deleted:`, offerDeleteCount);
          totalOfferDeletes += offerDeleteCount || 0;
        }
      }
      
      console.log(`🔍 BACKEND DEBUG - Offer delete summary: ${totalOfferDeletes} successful, ${offerDeleteErrors} failed`);
    } else {
      console.log('🔍 BACKEND DEBUG - No offer IDs to delete from offers table');
    }

    // Bulk delete all recycle bin items at once - BATCHED
    console.log('🔍 BACKEND DEBUG - Deleting items from recycle_bin table...');
    
    let totalRecycleDeletes = 0;
    let recycleDeleteErrors = 0;
    
    for (let i = 0; i < recycleIds.length; i += batchSize) {
      const recycleBatch = recycleIds.slice(i, i + batchSize);
      console.log(`🔍 BACKEND DEBUG - Deleting recycle batch ${Math.floor(i/batchSize) + 1}, count: ${recycleBatch.length}`);
      
      const { error: recycleDeleteError, count: recycleDeleteCount } = await supabase
        .from('recycle_bin')
        .delete()
        .in('id', recycleBatch);
        
      if (recycleDeleteError) {
        console.error(`❌ Recycle batch ${Math.floor(i/batchSize) + 1} delete error:`, recycleDeleteError);
        recycleDeleteErrors++;
      } else {
        console.log(`✅ Recycle batch ${Math.floor(i/batchSize) + 1} deleted:`, recycleDeleteCount);
        totalRecycleDeletes += recycleDeleteCount || 0;
      }
    }
    
    console.log(`🔍 BACKEND DEBUG - Recycle delete summary: ${totalRecycleDeletes} successful, ${recycleDeleteErrors} failed`);

    // Update success/failure counts based on actual deletions
    successful = totalRecycleDeletes;
    failed = recycleIds.length - totalRecycleDeletes;
    
    console.log('🔍 BACKEND DEBUG - Final result:', { successful, failed, totalRecycleDeletes, recycleDeleteErrors });
    console.log('🔄 Triggering recycle bin refresh after bulk move');
    // Dispatch custom event to notify frontend
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('recycleBinUpdated', { 
        detail: { action: 'bulk_moved', count: successful } 
      }));
    }
    
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
  
  // Trigger refresh of All Offers data after cleanup
  console.log('🔄 Triggering All Offers refresh after cleanup');
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
