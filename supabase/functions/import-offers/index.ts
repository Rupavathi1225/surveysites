import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get request body
    const { provider, action } = await req.json();

    if (!provider) {
      return new Response(
        JSON.stringify({ error: "Provider is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Get API configuration from database
    const { data: config, error: configError } = await supabase
      .from("api_import_configs")
      .select("*")
      .eq("provider_name", provider)
      .eq("is_active", true)
      .single();

    if (configError || !config) {
      return new Response(
        JSON.stringify({ error: "Provider configuration not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    // Get API key from environment variables (stored securely in Supabase secrets)
    // The secret name is stored in the config, we look up the actual value from env
    const apiKeyName = config.api_key_secret_name;
    const apiKey = Deno.env.get(apiKeyName);

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: `API key not configured. Please set ${apiKeyName} in Supabase secrets.` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // Fetch offers based on provider
    let offers: any[] = [];

    if (provider === "CPX Research") {
      offers = await fetchCPXOffers(config.api_endpoint, apiKey);
    } else if (provider === "BitLabs") {
      offers = await fetchBitLabsOffers(config.api_endpoint, apiKey);
    } else {
      return new Response(
        JSON.stringify({ error: `Unsupported provider: ${provider}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // If action is just "preview", return the offers without importing
    if (action === "preview") {
      return new Response(
        JSON.stringify({ 
          success: true, 
          count: offers.length,
          offers: offers.slice(0, 50) // Return first 50 for preview
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Import offers into database
    const importedOffers = await importOffers(supabase, offers, provider);

    return new Response(
      JSON.stringify({ 
        success: true, 
        imported: importedOffers.imported,
        skipped: importedOffers.skipped,
        total: offers.length
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

// CPX Research API fetch function
async function fetchCPXOffers(apiEndpoint: string, apiKey: string): Promise<any[]> {
  try {
    const response = await fetch(apiEndpoint, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`CPX API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Transform CPX response to our format
    // Adjust this based on actual CPX API response structure
    if (data.offers && Array.isArray(data.offers)) {
      return data.offers.map((offer: any) => ({
        offer_id: offer.offer_id?.toString() || offer.id?.toString(),
        title: offer.name || offer.title,
        description: offer.description || "",
        payout: parseFloat(offer.reward || offer.payout || 0),
        currency: offer.currency || "USD",
        url: offer.redirect_url || offer.url || offer.link,
        image_url: offer.image_url || offer.image || offer.thumbnail,
        provider: "CPX Research",
        source: "api",
        status: offer.status === "active" ? "active" : "inactive",
        countries: offer.countries?.join(", ") || offer.geo || "",
        platform: offer.platform || "",
        device: offer.device || "",
        vertical: offer.category || offer.vertical || "",
      }));
    }

    return [];
  } catch (error) {
    console.error("Error fetching CPX offers:", error);
    throw error;
  }
}

// BitLabs API fetch function
async function fetchBitLabsOffers(apiEndpoint: string, apiKey: string): Promise<any[]> {
  try {
    const response = await fetch(apiEndpoint, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`BitLabs API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Transform BitLabs response to our format
    // Adjust this based on actual BitLabs API response structure
    if (data.data && Array.isArray(data.data)) {
      return data.data.map((offer: any) => ({
        offer_id: offer.external_offer_id?.toString() || offer.id?.toString(),
        title: offer.name || offer.title,
        description: offer.description || "",
        payout: parseFloat(offer.reward || offer.payout || 0),
        currency: offer.currency || "USD",
        url: offer.redirect_url || offer.url || offer.link,
        image_url: offer.image_url || offer.image || offer.thumbnail,
        provider: "BitLabs",
        source: "api",
        status: offer.status === "active" ? "active" : "inactive",
        countries: offer.countries?.join(", ") || offer.geo || "",
        platform: offer.platform || "",
        device: offer.device || "",
        vertical: offer.category || offer.vertical || "",
      }));
    }

    return [];
  } catch (error) {
    console.error("Error fetching BitLabs offers:", error);
    throw error;
  }
}

// Import offers into database with deduplication
async function importOffers(supabase: any, offers: any[], provider: string): Promise<{imported: number, skipped: number}> {
  let imported = 0;
  let skipped = 0;

  for (const offer of offers) {
    try {
      // Check if offer already exists
      const { data: existing } = await supabase
        .from("offers")
        .select("id")
        .eq("offer_id", offer.offer_id)
        .eq("provider", provider)
        .single();

      if (existing) {
        // Update existing offer
        await supabase
          .from("offers")
          .update({
            title: offer.title,
            description: offer.description,
            payout: offer.payout,
            currency: offer.currency,
            url: offer.url,
            image_url: offer.image_url,
            status: offer.status,
            countries: offer.countries,
            platform: offer.platform,
            device: offer.device,
            vertical: offer.vertical,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      } else {
        // Insert new offer
        await supabase.from("offers").insert({
          offer_id: offer.offer_id,
          title: offer.title,
          description: offer.description,
          payout: offer.payout,
          currency: offer.currency,
          url: offer.url,
          image_url: offer.image_url,
          provider: provider,
          source: "api",
          status: offer.status || "active",
          countries: offer.countries,
          platform: offer.platform,
          device: offer.device,
          vertical: offer.vertical,
        });
        imported++;
      }
    } catch (error) {
      console.error(`Error importing offer ${offer.offer_id}:`, error);
      skipped++;
    }
  }

  return { imported, skipped };
}
