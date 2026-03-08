import { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trackClickRobust } from "@/lib/clickTrackingHelper";

interface Provider {
  id: string;
  name: string;
  image_url: string | null;
  iframe_url: string | null;
  iframe_code: string | null;
}

const OfferwallViewer = () => {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [provider, setProvider] = useState<Provider | null>(location.state?.provider || null);
  const [username, setUsername] = useState<string>("anonymous");
  const [iframeSrc, setIframeSrc] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const clickTrackedRef = useRef(false);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get username and profile id
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, username")
        .eq("user_id", user.id)
        .single();

      const uname = profile?.username || "anonymous";
      setUsername(uname);

      let currentProvider = provider;

      // If no provider from navigation state, fetch by slug
      if (!currentProvider && slug) {
        const { data: providers } = await supabase
          .from("survey_providers")
          .select("*")
          .eq("status", "active");

        const match = providers?.find(
          (p) => p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") === slug
        );

        if (match) {
          setProvider(match);
          currentProvider = match;
        }
      }

      // Fallback click tracking - track if not already tracked
      if (currentProvider && profile && !clickTrackedRef.current) {
        clickTrackedRef.current = true;
        console.log("[OfferwallViewer] Tracking click for provider:", currentProvider.name, currentProvider.id);
        trackClickRobust({
          user_id: profile.id,
          username: profile.username,
          provider_id: currentProvider.id,
        }).then(clickId => {
          console.log("[OfferwallViewer] Click tracked:", clickId);
        }).catch(err => {
          console.error("[OfferwallViewer] Click tracking failed:", err);
        });
      }

      setLoading(false);
    };

    init();
  }, [slug, provider]);

  useEffect(() => {
    if (!provider || !username) return;

    const replaceUser = (url: string) =>
      url
        .replace(/USER_ID/g, username)
        .replace(/\{user_id\}/g, username)
        .replace(/\{username\}/g, username);

    // Extract iframe src
    if (provider.iframe_code) {
      const match = provider.iframe_code.match(/src=["']([^"']+)["']/);
      if (match) {
        setIframeSrc(replaceUser(match[1]));
        return;
      }
    }

    if (provider.iframe_url) {
      setIframeSrc(replaceUser(provider.iframe_url));
    }
  }, [provider, username]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-muted-foreground">Offerwall not found.</p>
        <Button variant="outline" onClick={() => navigate("/dashboard/offerwalls")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Offerwalls
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/offerwalls")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-3">
          {provider.image_url && (
            <img src={provider.image_url} alt={provider.name} className="w-8 h-8 object-contain" />
          )}
          <h1 className="text-xl font-bold text-foreground">{provider.name}</h1>
        </div>
        {iframeSrc && (
          <Button variant="outline" size="sm" className="ml-auto" onClick={() => window.open(iframeSrc, "_blank")}>
            <ExternalLink className="h-4 w-4 mr-1" /> Open in new tab
          </Button>
        )}
      </div>

      {/* Iframe */}
      {iframeSrc ? (
        <div className="w-full rounded-xl overflow-hidden border border-border bg-card" style={{ height: "calc(100vh - 200px)" }}>
          <iframe
            src={iframeSrc}
            className="w-full h-full border-0"
            title={provider.name}
            allow="clipboard-write"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-top-navigation"
          />
        </div>
      ) : (
        <div className="flex items-center justify-center min-h-[400px] bg-card rounded-xl border border-border">
          <p className="text-muted-foreground">No iframe URL configured for this offerwall.</p>
        </div>
      )}
    </div>
  );
};

export default OfferwallViewer;
