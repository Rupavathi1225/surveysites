// Simple script to test network_id functionality
// Run this in browser console on admin page

const testNetworkId = async () => {
  console.log("Testing network_id functionality...");
  
  // Check if we can update an offer with network_id
  try {
    const { data: offers, error } = await supabase
      .from("offers")
      .select("id, title, network_id")
      .limit(5);
    
    console.log("Current offers:", offers);
    
    if (offers && offers.length > 0) {
      const firstOffer = offers[0];
      console.log("Updating offer:", firstOffer.id, "with network_id");
      
      const { data: updated, error: updateError } = await supabase
        .from("offers")
        .update({ network_id: "test-network-123" })
        .eq("id", firstOffer.id)
        .select();
      
      console.log("Update result:", updated, updateError);
      
      // Test reading it back
      const { data: testRead } = await supabase
        .from("offers")
        .select("id, title, network_id")
        .eq("id", firstOffer.id);
      
      console.log("Read back result:", testRead);
    }
  } catch (err) {
    console.error("Test failed:", err);
  }
};

// Run the test
testNetworkId();
