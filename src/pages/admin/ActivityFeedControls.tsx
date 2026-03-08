import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, Save, RotateCcw, Gauge } from "lucide-react";
import { toast } from "sonner";

const FEED_TOGGLES = [
  { key: "feed_show_offers", label: "Offer Completions", desc: "Show when users complete offers" },
  { key: "feed_show_surveys", label: "Survey Completions", desc: "Show when users complete surveys" },
  { key: "feed_show_signups", label: "New Signups", desc: "Show when new users register" },
  { key: "feed_show_withdrawals", label: "Withdrawals", desc: "Show when users withdraw funds" },
  { key: "feed_show_logins", label: "Logins", desc: "Show when users log in" },
  { key: "feed_show_contests", label: "Contest Wins", desc: "Show contest winner announcements" },
  { key: "feed_show_referrals", label: "Referrals", desc: "Show referral earnings" },
  { key: "feed_show_promocodes", label: "Promo Codes", desc: "Show promo code redemptions" },
];

const SPEED_KEY = "feed_scroll_speed";
const DEFAULT_SPEED = 120; // seconds for full scroll

const ActivityFeedControls = () => {
  const [toggles, setToggles] = useState<Record<string, boolean>>({});
  const [speed, setSpeed] = useState(DEFAULT_SPEED);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    const keys = [...FEED_TOGGLES.map(t => t.key), SPEED_KEY];
    const { data } = await supabase.from("website_settings").select("key, value").in("key", keys);

    const settingsMap = new Map((data || []).map(s => [s.key, s.value]));

    const newToggles: Record<string, boolean> = {};
    FEED_TOGGLES.forEach(t => {
      const val = settingsMap.get(t.key);
      // Default: offers and surveys ON, rest OFF
      newToggles[t.key] = val !== undefined ? val === "true" : (t.key === "feed_show_offers" || t.key === "feed_show_surveys");
    });
    setToggles(newToggles);

    const speedVal = settingsMap.get(SPEED_KEY);
    setSpeed(speedVal ? parseInt(speedVal) : DEFAULT_SPEED);

    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);

    // Upsert all toggle settings + speed
    const allSettings = [
      ...FEED_TOGGLES.map(t => ({ key: t.key, value: String(toggles[t.key] ?? false) })),
      { key: SPEED_KEY, value: String(speed) },
    ];

    for (const setting of allSettings) {
      // Check if exists
      const { data: existing } = await supabase
        .from("website_settings")
        .select("id")
        .eq("key", setting.key)
        .maybeSingle();

      if (existing) {
        await supabase.from("website_settings").update({ value: setting.value }).eq("key", setting.key);
      } else {
        await supabase.from("website_settings").insert({ key: setting.key, value: setting.value });
      }
    }

    setSaving(false);
    toast.success("Activity feed settings saved!");
  };

  const handleReset = () => {
    const newToggles: Record<string, boolean> = {};
    FEED_TOGGLES.forEach(t => {
      newToggles[t.key] = t.key === "feed_show_offers" || t.key === "feed_show_surveys";
    });
    setToggles(newToggles);
    setSpeed(DEFAULT_SPEED);
  };

  const getSpeedLabel = (s: number) => {
    if (s <= 40) return "Very Fast";
    if (s <= 80) return "Fast";
    if (s <= 120) return "Normal";
    if (s <= 180) return "Slow";
    return "Very Slow";
  };

  const enabledCount = Object.values(toggles).filter(Boolean).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            Activity Feed Controls
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Control what appears in the live activity ticker on the user dashboard
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-1" /> Reset
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-1" /> {saving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </div>

      {/* Activity Type Toggles */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Activity Type Visibility</CardTitle>
            <Badge variant="outline" className="text-xs">{enabledCount} of {FEED_TOGGLES.length} enabled</Badge>
          </div>
          <p className="text-xs text-muted-foreground">Toggle which activity types appear in the live feed. Only enabled types will be visible to users.</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FEED_TOGGLES.map(t => (
              <div key={t.key} className="flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:border-primary/30 transition-colors">
                <div>
                  <p className="text-sm font-medium text-foreground">{t.label}</p>
                  <p className="text-xs text-muted-foreground">{t.desc}</p>
                </div>
                <Switch
                  checked={toggles[t.key] ?? false}
                  onCheckedChange={(checked) => setToggles(prev => ({ ...prev, [t.key]: checked }))}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Scroll Speed Control */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Gauge className="h-5 w-5 text-primary" />
            Scroll Speed
          </CardTitle>
          <p className="text-xs text-muted-foreground">Adjust how fast the activity ticker scrolls on the user dashboard</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Speed</span>
              <Badge variant={speed <= 80 ? "default" : speed <= 120 ? "secondary" : "outline"}>
                {getSpeedLabel(speed)} ({speed}s)
              </Badge>
            </div>
            <Slider
              value={[speed]}
              onValueChange={([v]) => setSpeed(v)}
              min={20}
              max={240}
              step={10}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>⚡ Very Fast (20s)</span>
              <span>Normal (120s)</span>
              <span>🐢 Very Slow (240s)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview Info */}
      <Card>
        <CardContent className="py-4">
          <p className="text-xs text-muted-foreground text-center">
            Changes take effect immediately on the user dashboard after saving. The activity ticker will only display events matching the enabled types above.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ActivityFeedControls;
