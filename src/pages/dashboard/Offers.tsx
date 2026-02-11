import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const Offers = () => {
  const [providers, setProviders] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("survey_providers").select("*").eq("status", "active").order("is_recommended", { ascending: false }).then(({ data }) => setProviders(data || []));
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Exclusive Offers</h1>
      <p className="text-muted-foreground">Complete offers from our partners to earn</p>
      {providers.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">No offers available. Check back later!</CardContent></Card>
      ) : (
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
      )}
    </div>
  );
};
export default Offers;
