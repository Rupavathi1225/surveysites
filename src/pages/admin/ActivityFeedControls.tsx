import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Activity, Save, RotateCcw, Gauge, Palette } from "lucide-react";
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
const COLOR1_KEY = "feed_box_color1";
const COLOR2_KEY = "feed_box_color2";
const DEFAULT_SPEED = 120;
const DEFAULT_COLOR1 = "#1e293b";
const DEFAULT_COLOR2 = "#334155";

const ActivityFeedControls = () => {
  const [toggles, setToggles] = useState<Record<string, boolean>>({});
  const [speed, setSpeed] = useState(DEFAULT_SPEED);
  const [color1, setColor1] = useState(DEFAULT_COLOR1);
  const [color2, setColor2] = useState(DEFAULT_COLOR2);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    const keys = [...FEED_TOGGLES.map(t => t.key), SPEED_KEY, COLOR1_KEY, COLOR2_KEY];
    const { data } = await supabase.from("website_settings").select("key, value").in("key", keys);

    const settingsMap = new Map((data || []).map(s => [s.key, s.value]));

    const newToggles: Record<string, boolean> = {};
    FEED_TOGGLES.forEach(t => {
      const val = settingsMap.get(t.key);
      newToggles[t.key] = val !== undefined ? val === "true" : (t.key === "feed_show_offers" || t.key === "feed_show_surveys");
    });
    setToggles(newToggles);

    setSpeed(parseInt(settingsMap.get(SPEED_KEY) || "") || DEFAULT_SPEED);
    setColor1(settingsMap.get(COLOR1_KEY) || DEFAULT_COLOR1);
    setColor2(settingsMap.get(COLOR2_KEY) || DEFAULT_COLOR2);

    setLoading(false);
  };

  const upsertSettings = async (allSettings: { key: string; value: string }[]) => {
    for (const setting of allSettings) {
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
  };

  const handleSave = async () => {
    setSaving(true);
    const allSettings = [
      ...FEED_TOGGLES.map(t => ({ key: t.key, value: String(toggles[t.key] ?? false) })),
      { key: SPEED_KEY, value: String(speed) },
      { key: COLOR1_KEY, value: color1 },
      { key: COLOR2_KEY, value: color2 },
    ];
    await upsertSettings(allSettings);
    setSaving(false);
    toast.success("Activity feed settings saved!");
  };

  const handleReset = async () => {
    const defaultToggles: Record<string, boolean> = {};
    FEED_TOGGLES.forEach(t => {
      defaultToggles[t.key] = t.key === "feed_show_offers" || t.key === "feed_show_surveys";
    });
    setToggles(defaultToggles);
    setSpeed(DEFAULT_SPEED);
    setColor1(DEFAULT_COLOR1);
    setColor2(DEFAULT_COLOR2);

    // Save defaults to DB
    setSaving(true);
    const allSettings = [
      ...FEED_TOGGLES.map(t => ({ key: t.key, value: String(defaultToggles[t.key]) })),
      { key: SPEED_KEY, value: String(DEFAULT_SPEED) },
      { key: COLOR1_KEY, value: DEFAULT_COLOR1 },
      { key: COLOR2_KEY, value: DEFAULT_COLOR2 },
    ];
    await upsertSettings(allSettings);
    setSaving(false);
    toast.success("Activity feed settings reset to defaults!");
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
          <Button variant="outline" size="sm" onClick={handleReset} disabled={saving}>
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
          <p className="text-xs text-muted-foreground">Toggle which activity types appear in the live feed.</p>
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

      {/* Box Color Control */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            Ticker Box Colors
          </CardTitle>
          <p className="text-xs text-muted-foreground">Pick two colors to create a gradient background for each activity ticker box on the user dashboard</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-sm text-foreground">Color 1 (Start)</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={color1}
                  onChange={(e) => setColor1(e.target.value)}
                  className="w-12 h-10 rounded-lg border border-border cursor-pointer bg-transparent"
                />
                <Input
                  value={color1}
                  onChange={(e) => setColor1(e.target.value)}
                  className="flex-1 font-mono text-sm"
                  placeholder="#1e293b"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-foreground">Color 2 (End)</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={color2}
                  onChange={(e) => setColor2(e.target.value)}
                  className="w-12 h-10 rounded-lg border border-border cursor-pointer bg-transparent"
                />
                <Input
                  value={color2}
                  onChange={(e) => setColor2(e.target.value)}
                  className="flex-1 font-mono text-sm"
                  placeholder="#334155"
                />
              </div>
            </div>
          </div>
          {/* Live Preview */}
          <div className="mt-4">
            <p className="text-xs text-muted-foreground mb-2">Preview:</p>
            <div
              className="rounded-xl px-4 py-3 border border-foreground/5 flex items-center gap-3"
              style={{ background: `linear-gradient(135deg, ${color1}, ${color2})` }}
            >
              <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-foreground/70">P</span>
              </div>
              <div className="flex flex-col gap-0.5 flex-1">
                <span className="text-sm font-semibold text-white">SampleUser</span>
                <span className="text-xs text-white/60">PrimeWall</span>
              </div>
              <span className="text-lg font-bold text-white">150 pts</span>
            </div>
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
          <p className="text-xs text-muted-foreground">Adjust how fast the activity ticker scrolls</p>
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

      <Card>
        <CardContent className="py-4">
          <p className="text-xs text-muted-foreground text-center">
            Changes take effect immediately on the user dashboard after saving.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ActivityFeedControls;
