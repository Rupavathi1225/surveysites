import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const DailySurveys = () => {
  const [surveys, setSurveys] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("survey_links").select("*").eq("status", "active").order("is_recommended", { ascending: false }).then(({ data }) => setSurveys(data || []));
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Daily Surveys</h1>
      <p className="text-muted-foreground">Complete surveys to earn points</p>
      {surveys.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">No surveys available. Check back later!</CardContent></Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {surveys.map((s) => (
            <Card key={s.id} className="hover:border-primary/50 transition-colors">
              <CardContent className="p-6">
                <h3 className="font-semibold text-lg">{s.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{s.content || "Complete this survey to earn points"}</p>
                <p className="text-primary font-bold text-xl mt-3">{s.payout} points</p>
                {s.link && <Button className="mt-3 w-full" asChild><a href={s.link} target="_blank" rel="noopener">{s.button_text || "Start Survey"}</a></Button>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
export default DailySurveys;
