import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const Offers = () => {
  const [providers, setProviders] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("survey_providers").select("*").eq("status", "active").order("is_recommended", { ascending: false }).then(({ data }) => setProviders(data || []));
    supabase.from("offers").select("*").eq("status", "active").order("created_at", { ascending: false }).then(({ data }) => setOffers(data || []));
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Exclusive Offers</h1>
      <p className="text-muted-foreground">Complete offers from our partners to earn</p>

      {offers.length > 0 && (
        <>
          <h2 className="text-lg font-semibold">Available Offers</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {offers.map((o) => (
              <Card key={o.id} className="hover:border-primary/50 transition-colors">
                <CardContent className="p-6">
                  {o.image_url && <img src={o.image_url} alt={o.title} className="w-full h-32 object-cover rounded-lg mb-3" />}
                  <h3 className="font-semibold text-lg">{o.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{o.description || "Complete this offer to earn"}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="default">{o.currency} {o.payout}</Badge>
                    <Badge variant="secondary">{o.payout_model}</Badge>
                  </div>
                  {o.countries && <p className="text-xs text-muted-foreground mt-1">🌍 {o.countries}</p>}
                  {o.url && (
                    <Button className="mt-3 w-full" onClick={() => window.open(o.url, "_blank")}>
                      Complete Offer
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {providers.length > 0 && (
        <>
          <h2 className="text-lg font-semibold">Partner Offerwalls</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {providers.map((p) => (
              <Card key={p.id} className="hover:border-primary/50 transition-colors">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-lg">{p.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{p.content || "Complete offers to earn"}</p>
                  {p.is_recommended && <span className="text-xs text-primary font-medium">⭐ Recommended</span>}
                  <Button className="mt-3 w-full">{p.button_text || "Open Offers"}</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {offers.length === 0 && providers.length === 0 && (
        <Card><CardContent className="p-8 text-center text-muted-foreground">No offers available. Check back later!</CardContent></Card>
      )}
    </div>
  );
};
export default Offers;
