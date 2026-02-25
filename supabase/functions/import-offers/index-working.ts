import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Set headers for all responses
  const headers = {
    ...corsHeaders,
    "Content-Type": "application/json",
  };

  try {
    const body = await req.json();
    const { provider, network_id, api_endpoint, api_key, action } = body;

    if (!api_endpoint) {
      return new Response(JSON.stringify({ error: "API endpoint is required" }), {
        headers,
        status: 400,
      });
    }

    // Create Supabase client
    const supabaseUrl = globalThis.Deno?.env.get("SUPABASE_URL") || "";
    const supabaseKey = globalThis.Deno?.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    let apiResponse = null;
    let workingMethod = null;

    const requestMethods = [
      // No auth
      { method: "GET", headers: { "Content-Type": "application/json", "Accept": "application/json" } },
      // Bearer token
      { method: "GET", headers: { "Content-Type": "application/json", "Accept": "application/json", "Authorization": `Bearer ${api_key}` } },
      // API Key headers
      { method: "GET", headers: { "Content-Type": "application/json", "Accept": "application/json", "X-API-Key": api_key } },
      { method: "GET", headers: { "Content-Type": "application/json", "Accept": "application/json", "apikey": api_key } },
      { method: "GET", headers: { "Content-Type": "application/json", "Accept": "application/json", "API-Key": api_key } },
      // Token headers
      { method: "GET", headers: { "Content-Type": "application/json", "Accept": "application/json", "X-Auth-Token": api_key } },
      { method: "GET", headers: { "Content-Type": "application/json", "Accept": "application/json", "token": api_key } },
      { method: "GET", headers: { "Content-Type": "application/json", "Accept": "application/json", "auth-token": api_key } },
      { method: "GET", headers: { "Content-Type": "application/json", "Accept": "application/json", "Authentication": api_key } },
      // POST with auth in body
      { method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json" }, body: JSON.stringify({ api_key }) },
      { method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json" }, body: JSON.stringify({ token: api_key }) },
      { method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json" }, body: JSON.stringify({ auth_token: api_key }) },
      { method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json" }, body: JSON.stringify({ key: api_key }) },
      // POST with no body (some APIs use this)
      { method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json" } },
    ];

    // Try URL variations
    const baseUrl = api_endpoint.endsWith("/") ? api_endpoint.slice(0, -1) : api_endpoint;
    const variations = [
      api_endpoint,
      `${api_endpoint}?api_key=${api_key}`,
      `${api_endpoint}?token=${api_key}`,
      `${api_endpoint}?auth_token=${api_key}`,
      `${api_endpoint}?key=${api_key}`,
      `${api_endpoint}?auth=${api_key}`,
      `${api_endpoint}?access_token=${api_key}`,
      baseUrl.includes("/offers") ? baseUrl.replace("/offers", "/api/offers") : `${baseUrl}/api/offers`,
      baseUrl.includes("/offers") ? baseUrl.replace("/offers", "/v1/offers") : `${baseUrl}/v1/offers`,
      baseUrl.includes("/offers") ? baseUrl.replace("/offers", "/v2/offers") : `${baseUrl}/v2/offers`,
      baseUrl.includes("/offers") ? baseUrl.replace("/offers", "/v3/offers") : `${baseUrl}/v3/offers`,
      api_endpoint.endsWith(".json") ? api_endpoint : `${api_endpoint}.json`,
      api_endpoint.replace(/\/$/, "") + "/api/v1/offers",
      api_endpoint.replace(/\/$/, "") + "/api/v2/offers",
      api_endpoint.replace(/\/$/, "") + "/api/v3/offers",
    ];

    // Try each variation with each method
    for (const variation of variations) {
      for (const method of requestMethods) {
        try {
          console.log(`Trying: ${variation} with method:`, method);
          
          const requestOptions: RequestInit = {
            method: method.method,
          };
          
          // Add headers properly
          const headersObj: Record<string, string> = {};
          Object.assign(headersObj, method.headers);
          requestOptions.headers = headersObj;
          
          if (method.body) {
            requestOptions.body = method.body;
          }

          const response = await fetch(variation, requestOptions);
          const contentType = response.headers.get("content-type");
          
          console.log(`Response status: ${response.status}, Content-Type: ${contentType}`);
          
          if (contentType && contentType.includes("application/json")) {
            apiResponse = await response.json();
            workingMethod = { variation, method: method.method, headers: method.headers };
            console.log("Success with:", workingMethod);
            break;
          }
        } catch (error) {
          console.log("Failed:", variation, error);
        }
      }
      if (apiResponse) break;
    }

    if (!apiResponse) {
      return new Response(JSON.stringify({ 
        error: "API did not return JSON after trying multiple methods and variations",
        details: {
          endpoint: api_endpoint,
          variations_tried: variations.length,
          methods_tried: requestMethods.length
        }
      }), {
        headers,
        status: 400,
      });
    }

    // Parse offers from response
    const offersArray = apiResponse.offers || apiResponse.data || apiResponse.results || apiResponse.items || [];
    
    if (action === "test") {
      return new Response(JSON.stringify({
        success: true,
        message: "API connection successful",
        working_method: workingMethod,
        total_offers: offersArray.length
      }), {
        headers,
        status: 200,
      });
    }

    if (action === "preview") {
      // Transform offers to our format
      const transformedOffers = offersArray.map((offer: any, idx: number) => ({
        offer_id: offer.offer_id?.toString() || offer.id?.toString() || `offer-${idx}`,
        title: offer.name || offer.title || "Untitled Offer",
        description: offer.description || "",
        payout: parseFloat(offer.payout || offer.reward || offer.amount || 0),
        currency: offer.currency || "USD",
        url: offer.redirect_url || offer.url || offer.link || "",
        image_url: offer.image_url || offer.image || "",
        status: offer.status === "active" ? "active" : "inactive",
        countries: offer.countries?.join(", ") || offer.geo || "",
      }));

      return new Response(JSON.stringify({
        success: true,
        offers: transformedOffers,
        count: transformedOffers.length,
        working_method: workingMethod
      }), {
        headers,
        status: 200,
      });
    }

    if (action === "import") {
      let imported = 0;
      let skipped = 0;

      for (const [idx, offer] of offersArray.entries()) {
        try {
          const transformedOffer = {
            offer_id: offer.offer_id?.toString() || offer.id?.toString() || `offer-${idx}`,
            title: offer.name || offer.title || "Untitled Offer",
            description: offer.description || "",
            payout: parseFloat(offer.payout || offer.reward || offer.amount || 0),
            currency: offer.currency || "USD",
            url: offer.redirect_url || offer.url || offer.link || "",
            image_url: offer.image_url || offer.image || "",
            provider: provider,
            source: "api",
            status: offer.status === "active" ? "active" : "inactive",
            countries: offer.countries?.join(", ") || offer.geo || "",
          };

          // Check if offer already exists
          const { data: existing } = await supabase
            .from("offers")
            .select("id")
            .eq("offer_id", transformedOffer.offer_id)
            .eq("provider", provider)
            .single();

          if (existing) {
            // Update existing offer
            await supabase
              .from("offers")
              .update({
                ...transformedOffer,
                updated_at: new Date().toISOString(),
              })
              .eq("id", existing.id);
            skipped++;
          } else {
            // Insert new offer
            await supabase.from("offers").insert(transformedOffer);
            imported++;
          }
        } catch (error) {
          console.error(`Error importing offer:`, error);
          skipped++;
        }
      }

      return new Response(JSON.stringify({
        success: true,
        message: `Import complete! Imported: ${imported}, Skipped: ${skipped}`,
        imported,
        skipped,
        total: offersArray.length
      }), {
        headers,
        status: 200,
      });
    }

    return new Response(JSON.stringify({
      success: false,
      error: "Invalid action"
    }), {
      headers,
      status: 400,
    });

  } catch (error: any) {
    console.error("Edge function error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || "Internal server error"
    }), {
      headers,
      status: 500,
    });
  }
});
