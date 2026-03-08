import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Lock, Shield } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useNavigate } from "react-router-dom";
import { trackClickRobust } from "@/lib/clickTrackingHelper";

interface Provider {
  id: string;
  name: string;
  image_url: string | null;
  iframe_url: string | null;
  iframe_code: string | null;
  point_percentage: number | null;
  status: string | null;
  is_recommended: boolean | null;
  level: number | null;
}

interface Profile {
  id: string;
  username: string | null;
  points: number | null;
}

const Offerwalls = () => {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [providersRes, profileRes] = await Promise.all([
        supabase.from("survey_providers").select("*").eq("status", "active").order("is_recommended", { ascending: false }),
        supabase.from("profiles").select("id, username, points").eq("user_id", user.id).single(),
      ]);

      setProviders(providersRes.data || []);
      setProfile(profileRes.data);
      setLoading(false);
    };

    fetchData();
  }, []);

  const getSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const getUnlockAmount = (provider: Provider): number | null => {
    if (provider.level && provider.level > 1) {
      return provider.level * 2.5;
    }
    return null;
  };

  const isLocked = (provider: Provider): boolean => {
    const unlockAmount = getUnlockAmount(provider);
    if (!unlockAmount) return false;
    const userEarnings = (profile?.points || 0) / 100; // Convert points to dollars
    return userEarnings < unlockAmount;
  };

  const getBonusPercentage = (provider: Provider): number | null => {
    if (provider.point_percentage && provider.point_percentage > 100) {
      return provider.point_percentage - 100;
    }
    return null;
  };

  const handleClick = async (provider: Provider) => {
    if (isLocked(provider)) return;
    
    // Track the click - await to ensure it completes before navigation
    if (profile) {
      await trackClickRobust({
        user_id: profile.id,
        username: profile.username,
        provider_id: provider.id,
      });
    }
    
    const slug = getSlug(provider.name);
    navigate(`/dashboard/offerwall/${slug}`, { state: { provider } });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Shield className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Offer Walls</h1>
        </div>
        <p className="text-sm text-muted-foreground">Each offer wall contains hundreds of offers to complete</p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {providers.map((provider) => {
          const locked = isLocked(provider);
          const bonus = getBonusPercentage(provider);
          const unlockAmount = getUnlockAmount(provider);

          return (
            <Tooltip key={provider.id}>
              <TooltipTrigger asChild>
                <div className="flex flex-col items-center gap-0 cursor-pointer" onClick={() => handleClick(provider)}>
                  {/* Card */}
                  <div className={`relative w-full aspect-[4/3] bg-card border border-border/50 rounded-t-xl overflow-hidden group transition-all duration-300 ${
                    locked
                      ? "opacity-70"
                      : "hover:scale-[1.03] hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10"
                  }`}>
                    {/* Bonus Badge */}
                    {bonus && (
                      <div className="absolute top-2 right-2 bg-gradient-to-r from-blue-500 to-blue-600 text-foreground text-[11px] font-bold px-2 py-0.5 rounded-full shadow-md z-10">
                        +{bonus}%
                      </div>
                    )}

                    {/* Logo */}
                    <div className={`flex items-center justify-center h-full p-4 ${locked ? "blur-[2px]" : ""}`}>
                      {provider.image_url ? (
                        <img
                          src={provider.image_url}
                          alt={provider.name}
                          className="max-w-[80%] max-h-[80%] object-contain group-hover:scale-110 transition-transform duration-300"
                        />
                      ) : (
                        <span className="text-3xl font-bold text-foreground/50">{provider.name.charAt(0)}</span>
                      )}
                    </div>

                    {/* Lock Overlay */}
                    {locked && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/40 backdrop-blur-[1px]">
                        <Lock className="h-6 w-6 text-foreground/70 mb-1" />
                        <span className="text-[11px] font-medium text-foreground/80">
                          Earn ${unlockAmount?.toFixed(2)} to unlock
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Name Bar */}
                  <div className="w-full bg-card/80 border border-t-0 border-border/50 rounded-b-xl py-2 px-2 text-center">
                    <span className="text-sm font-medium text-foreground truncate block">{provider.name}</span>
                  </div>
                </div>
              </TooltipTrigger>
              {locked && (
                <TooltipContent>
                  <p>Complete earnings requirement to unlock this offerwall.</p>
                </TooltipContent>
              )}
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
};

export default Offerwalls;
