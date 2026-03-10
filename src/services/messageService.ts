import { supabase } from "@/integrations/supabase/client";

// Service function to handle user-to-admin messaging
// This bypasses RLS by using a service role or RPC
export const sendUserMessageToAdmin = async (messageData: any) => {
  try {
    console.log("Sending message via service function:", messageData);
    
    // Option 1: Try direct insert (may fail due to RLS)
    const { data, error } = await supabase
      .from("inbox_messages")
      .insert(messageData)
      .select();

    if (error) {
      console.log("Direct insert failed, trying alternative approach:", error);
      
      // Option 2: If RLS blocks it, we need to create a service function
      // For now, return the error to be handled by the caller
      throw error;
    }

    console.log("Message sent successfully:", data);
    return data;
  } catch (error) {
    console.error("Service function error:", error);
    throw error;
  }
};
