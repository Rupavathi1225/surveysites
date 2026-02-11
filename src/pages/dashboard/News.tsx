import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";

const News = () => {
  const [news, setNews] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("news").select("*").order("created_at", { ascending: false }).then(({ data }) => setNews(data || []));
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">News & Updates</h1>
      {news.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">No announcements yet</CardContent></Card>
      ) : news.map((n) => (
        <Card key={n.id}><CardContent className="p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">{n.title}</h3>
            <span className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleDateString()}</span>
          </div>
          <p className="text-sm text-muted-foreground">{n.content}</p>
        </CardContent></Card>
      ))}
    </div>
  );
};
export default News;
