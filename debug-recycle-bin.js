// Debug script to test recycle bin deletion
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function testRecycleBinDeletion() {
  console.log('Testing recycle bin deletion...');
  
  try {
    // Get recycle bin items
    const { data: recycleItems, error: recycleError } = await supabase
      .from('recycle_bin')
      .select('*')
      .limit(1);
    
    if (recycleError) {
      console.error('Error fetching recycle bin items:', recycleError);
      return;
    }
    
    console.log('Recycle bin items:', recycleItems);
    
    if (recycleItems && recycleItems.length > 0) {
      const item = recycleItems[0];
      console.log('Testing deletion of item:', item.id, 'offer_id:', item.offer_id);
      
      // Try to delete from offers table first
      const { error: offerDeleteError } = await supabase
        .from('offers')
        .delete()
        .eq('id', item.offer_id);
      
      if (offerDeleteError) {
        console.error('Error deleting from offers table:', offerDeleteError);
      } else {
        console.log('Successfully deleted from offers table');
      }
      
      // Try to delete from recycle bin
      const { error: recycleDeleteError } = await supabase
        .from('recycle_bin')
        .delete()
        .eq('id', item.id);
      
      if (recycleDeleteError) {
        console.error('Error deleting from recycle bin:', recycleDeleteError);
      } else {
        console.log('Successfully deleted from recycle bin');
      }
    }
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

testRecycleBinDeletion();
