import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Activity, Save, RotateCcw, Gauge, Palette, Hash, Play, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const FEED_TOGGLES = [
  { key: "feed_show_offers", countKey: "feed_count_offers", label: "Offer/Survey Completed", desc: "Show when users complete offers" },
  { key: "feed_show_surveys", countKey: "feed_count_surveys", label: "Survey Completions", desc: "Show when users complete surveys" },
  { key: "feed_show_signups", countKey: "feed_count_signups", label: "New User Signups", desc: "Show when new users register" },
  { key: "feed_show_logins", countKey: "feed_count_logins", label: "User Logins", desc: "Show when users log in" },
  { key: "feed_show_withdrawals", countKey: "feed_count_withdrawals", label: "Payment Requested", desc: "Show when users request withdrawals" },
  { key: "feed_show_payment_completed", countKey: "feed_count_payment_completed", label: "Payment Completed", desc: "Show when payments are completed" },
  { key: "feed_show_contests", countKey: "feed_count_contests", label: "Contest Wins", desc: "Show contest winner announcements" },
  { key: "feed_show_referrals", countKey: "feed_count_referrals", label: "Referrals", desc: "Show referral earnings" },
  { key: "feed_show_promocodes", countKey: "feed_count_promocodes", label: "Promocode Redeemed", desc: "Show promo code redemptions" },
  { key: "feed_show_new_promocodes", countKey: "feed_count_new_promocodes", label: "New Promocode Added", desc: "Show when new promo codes are added" },
  { key: "feed_show_new_offers", countKey: "feed_count_new_offers", label: "New Offers Added", desc: "Show when new offers are added" },
  { key: "feed_show_global_notifications", countKey: "feed_count_global_notifications", label: "Global Notifications", desc: "Show global notification announcements" },
  { key: "feed_show_feed_generator", countKey: "feed_count_feed_generator", label: "Feed Generator", desc: "Auto-generate simulated activity items" },
];

const COUNT_OPTIONS = ["10", "20", "30", "40", "50"];
const TOTAL_COUNT_OPTIONS = ["20", "30", "40", "50", "60", "80", "100"];
const SIZE_OPTIONS = [
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
  { value: "custom", label: "Custom" },
];

const SPEED_KEY = "feed_scroll_speed";
const COLOR1_KEY = "feed_box_color1";
const COLOR2_KEY = "feed_box_color2";
const USERNAME_COLOR_KEY = "feed_username_color";
const POINTS_COLOR_KEY = "feed_points_color";
const TOTAL_COUNT_KEY = "feed_total_count";
const BOX_SIZE_KEY = "feed_box_size";
const BOX_WIDTH_KEY = "feed_box_width";
const BOX_HEIGHT_KEY = "feed_box_height";
const BOX_PADDING_KEY = "feed_box_padding";
const BOX_FONT_SIZE_KEY = "feed_box_font_size";
const BOX_BORDER_RADIUS_KEY = "feed_box_border_radius";
const BOX_LOGO_SIZE_KEY = "feed_box_logo_size";
const BOX_LOGO_WIDTH_KEY = "feed_box_logo_width";
const BOX_LOGO_HEIGHT_KEY = "feed_box_logo_height";
const DEFAULT_SPEED = 120;
const DEFAULT_COLOR1 = "#1e293b";
const DEFAULT_COLOR2 = "#334155";
const DEFAULT_USERNAME_COLOR = "#ffffff";
const DEFAULT_POINTS_COLOR = "#ffffff";
const DEFAULT_TOTAL_COUNT = "20";
const DEFAULT_PER_TYPE_COUNT = "20";
const DEFAULT_BOX_SIZE = "medium";
const DEFAULT_BOX_WIDTH = "200";
const DEFAULT_BOX_HEIGHT = "60";
const DEFAULT_BOX_PADDING = "16";
const DEFAULT_BOX_FONT_SIZE = "14";
const DEFAULT_BOX_BORDER_RADIUS = "12";
const DEFAULT_BOX_LOGO_SIZE = "44";
const DEFAULT_LOGO_WIDTH = "40";
const DEFAULT_LOGO_HEIGHT = "10";

interface GeneratorEntry {
  username: string;
  amount: string;
  offerwall: string;
  country: string;
}

const ActivityFeedControls = () => {
  const [toggles, setToggles] = useState<Record<string, boolean>>({});
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [boxSize, setBoxSize] = useState(DEFAULT_BOX_SIZE);
  const [boxWidth, setBoxWidth] = useState(DEFAULT_BOX_WIDTH);
  const [boxHeight, setBoxHeight] = useState(DEFAULT_BOX_HEIGHT);
  const [boxPadding, setBoxPadding] = useState(DEFAULT_BOX_PADDING);
  const [boxFontSize, setBoxFontSize] = useState(DEFAULT_BOX_FONT_SIZE);
  const [boxBorderRadius, setBoxBorderRadius] = useState(DEFAULT_BOX_BORDER_RADIUS);
  const [boxLogoSize, setBoxLogoSize] = useState(DEFAULT_BOX_LOGO_SIZE);
  const [logoWidthPercent, setLogoWidthPercent] = useState(DEFAULT_LOGO_WIDTH);
  const [logoHeightPercent, setLogoHeightPercent] = useState(DEFAULT_LOGO_HEIGHT);
  const [usernameColor, setUsernameColor] = useState(DEFAULT_USERNAME_COLOR);
  const [pointsColor, setPointsColor] = useState(DEFAULT_POINTS_COLOR);
  const [totalCount, setTotalCount] = useState(DEFAULT_TOTAL_COUNT);
  const [speed, setSpeed] = useState(DEFAULT_SPEED);
  const [color1, setColor1] = useState(DEFAULT_COLOR1);
  const [color2, setColor2] = useState(DEFAULT_COLOR2);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Feed Generator state
  const [generatorEntries, setGeneratorEntries] = useState<GeneratorEntry[]>([
    { username: "", amount: "", offerwall: "", country: "" },
  ]);
  const [generatorRunning, setGeneratorRunning] = useState(false);

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    setLoading(true);
    const keys = [
      ...FEED_TOGGLES.map(t => t.key),
      ...FEED_TOGGLES.map(t => t.countKey),
      SPEED_KEY, COLOR1_KEY, COLOR2_KEY, TOTAL_COUNT_KEY, BOX_SIZE_KEY,
      BOX_WIDTH_KEY, BOX_HEIGHT_KEY, BOX_PADDING_KEY, BOX_FONT_SIZE_KEY, BOX_BORDER_RADIUS_KEY,
      BOX_LOGO_SIZE_KEY, BOX_LOGO_WIDTH_KEY, BOX_LOGO_HEIGHT_KEY, USERNAME_COLOR_KEY, POINTS_COLOR_KEY,
    ];
    const { data } = await supabase.from("website_settings").select("key, value").in("key", keys);
    const m = new Map((data || []).map(s => [s.key, s.value]));

    const newToggles: Record<string, boolean> = {};
    const newCounts: Record<string, string> = {};
    FEED_TOGGLES.forEach(t => {
      const val = m.get(t.key);
      newToggles[t.key] = val !== undefined ? val === "true" : (t.key === "feed_show_offers" || t.key === "feed_show_surveys");
      newCounts[t.countKey] = m.get(t.countKey) || DEFAULT_PER_TYPE_COUNT;
    });
    setToggles(newToggles);
    setCounts(newCounts);
    setBoxSize(m.get(BOX_SIZE_KEY) || DEFAULT_BOX_SIZE);
    setBoxWidth(m.get(BOX_WIDTH_KEY) || DEFAULT_BOX_WIDTH);
    setBoxHeight(m.get(BOX_HEIGHT_KEY) || DEFAULT_BOX_HEIGHT);
    setBoxPadding(m.get(BOX_PADDING_KEY) || DEFAULT_BOX_PADDING);
    setBoxFontSize(m.get(BOX_FONT_SIZE_KEY) || DEFAULT_BOX_FONT_SIZE);
    setBoxBorderRadius(m.get(BOX_BORDER_RADIUS_KEY) || DEFAULT_BOX_BORDER_RADIUS);
    setBoxLogoSize(m.get(BOX_LOGO_SIZE_KEY) || DEFAULT_BOX_LOGO_SIZE);
    setLogoWidthPercent(m.get(BOX_LOGO_WIDTH_KEY) || DEFAULT_LOGO_WIDTH);
    setLogoHeightPercent(m.get(BOX_LOGO_HEIGHT_KEY) || DEFAULT_LOGO_HEIGHT);
    setUsernameColor(m.get(USERNAME_COLOR_KEY) || DEFAULT_USERNAME_COLOR);
    setPointsColor(m.get(POINTS_COLOR_KEY) || DEFAULT_POINTS_COLOR);
    setTotalCount(m.get(TOTAL_COUNT_KEY) || DEFAULT_TOTAL_COUNT);
    setSpeed(parseInt(m.get(SPEED_KEY) || "") || DEFAULT_SPEED);
    setColor1(m.get(COLOR1_KEY) || DEFAULT_COLOR1);
    setColor2(m.get(COLOR2_KEY) || DEFAULT_COLOR2);
    setLoading(false);
  };

  const upsertSettings = async (allSettings: { key: string; value: string }[]) => {
    for (const setting of allSettings) {
      const { data: existing } = await supabase
        .from("website_settings").select("id").eq("key", setting.key).maybeSingle();
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
      ...FEED_TOGGLES.map(t => ({ key: t.countKey, value: counts[t.countKey] || DEFAULT_PER_TYPE_COUNT })),
      { key: TOTAL_COUNT_KEY, value: totalCount },
      { key: BOX_SIZE_KEY, value: boxSize },
      { key: BOX_WIDTH_KEY, value: boxWidth },
      { key: BOX_HEIGHT_KEY, value: boxHeight },
      { key: BOX_PADDING_KEY, value: boxPadding },
      { key: BOX_FONT_SIZE_KEY, value: boxFontSize },
      { key: BOX_BORDER_RADIUS_KEY, value: boxBorderRadius },
      { key: BOX_LOGO_SIZE_KEY, value: boxLogoSize },
      { key: BOX_LOGO_WIDTH_KEY, value: logoWidthPercent },
      { key: BOX_LOGO_HEIGHT_KEY, value: logoHeightPercent },
      { key: USERNAME_COLOR_KEY, value: usernameColor },
      { key: POINTS_COLOR_KEY, value: pointsColor },
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
    const defaultCounts: Record<string, string> = {};
    FEED_TOGGLES.forEach(t => {
      defaultToggles[t.key] = t.key === "feed_show_offers" || t.key === "feed_show_surveys";
      defaultCounts[t.countKey] = DEFAULT_PER_TYPE_COUNT;
    });
    setToggles(defaultToggles);
    setCounts(defaultCounts);
    setBoxSize(DEFAULT_BOX_SIZE);
    setBoxWidth(DEFAULT_BOX_WIDTH);
    setBoxHeight(DEFAULT_BOX_HEIGHT);
    setBoxPadding(DEFAULT_BOX_PADDING);
    setBoxFontSize(DEFAULT_BOX_FONT_SIZE);
    setBoxBorderRadius(DEFAULT_BOX_BORDER_RADIUS);
    setBoxLogoSize(DEFAULT_BOX_LOGO_SIZE);
    setLogoWidthPercent(DEFAULT_LOGO_WIDTH);
    setLogoHeightPercent(DEFAULT_LOGO_HEIGHT);
    setUsernameColor(DEFAULT_USERNAME_COLOR);
    setPointsColor(DEFAULT_POINTS_COLOR);
    setTotalCount(DEFAULT_TOTAL_COUNT);
    setSpeed(DEFAULT_SPEED);
    setColor1(DEFAULT_COLOR1);
    setColor2(DEFAULT_COLOR2);

    setSaving(true);
    const allSettings = [
      ...FEED_TOGGLES.map(t => ({ key: t.key, value: String(defaultToggles[t.key]) })),
      ...FEED_TOGGLES.map(t => ({ key: t.countKey, value: DEFAULT_PER_TYPE_COUNT })),
      { key: TOTAL_COUNT_KEY, value: DEFAULT_TOTAL_COUNT },
      { key: BOX_SIZE_KEY, value: DEFAULT_BOX_SIZE },
      { key: BOX_WIDTH_KEY, value: DEFAULT_BOX_WIDTH },
      { key: BOX_HEIGHT_KEY, value: DEFAULT_BOX_HEIGHT },
      { key: BOX_PADDING_KEY, value: DEFAULT_BOX_PADDING },
      { key: BOX_FONT_SIZE_KEY, value: DEFAULT_BOX_FONT_SIZE },
      { key: BOX_BORDER_RADIUS_KEY, value: DEFAULT_BOX_BORDER_RADIUS },
      { key: BOX_LOGO_SIZE_KEY, value: DEFAULT_BOX_LOGO_SIZE },
      { key: BOX_LOGO_WIDTH_KEY, value: DEFAULT_LOGO_WIDTH },
      { key: BOX_LOGO_HEIGHT_KEY, value: DEFAULT_LOGO_HEIGHT },
      { key: USERNAME_COLOR_KEY, value: DEFAULT_USERNAME_COLOR },
      { key: POINTS_COLOR_KEY, value: DEFAULT_POINTS_COLOR },
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

      {/* Total Display Count */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Hash className="h-5 w-5 text-primary" />
            Total Items to Display (Mixed)
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Total number of activity items shown in the ticker. This is the combined/mixed limit across all enabled types.
          </p>
        </CardHeader>
        <CardContent>
          <Select value={totalCount} onValueChange={setTotalCount}>
            <SelectTrigger className="w-full max-w-[200px]">
              <SelectValue placeholder="Select count" />
            </SelectTrigger>
            <SelectContent>
              {TOTAL_COUNT_OPTIONS.map(v => (
                <SelectItem key={v} value={v}>Latest {v} items</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Ticker Box Size */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Hash className="h-5 w-5 text-primary" />
            Ticker Box Size
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Choose a preset or set custom dimensions for all ticker boxes
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 flex-wrap">
            <Select value={boxSize} onValueChange={(v) => {
              setBoxSize(v);
              if (v === "small") { setBoxWidth("160"); setBoxHeight("44"); setBoxPadding("12"); setBoxFontSize("12"); setBoxBorderRadius("8"); setBoxLogoSize("28"); }
              if (v === "medium") { setBoxWidth("200"); setBoxHeight("60"); setBoxPadding("16"); setBoxFontSize("14"); setBoxBorderRadius("12"); setBoxLogoSize("44"); }
              if (v === "large") { setBoxWidth("280"); setBoxHeight("76"); setBoxPadding("20"); setBoxFontSize("16"); setBoxBorderRadius("16"); setBoxLogoSize("56"); }
            }}>
              <SelectTrigger className="w-full max-w-[200px]">
                <SelectValue placeholder="Select size" />
              </SelectTrigger>
              <SelectContent>
                {SIZE_OPTIONS.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Preset preview boxes */}
            <div className="flex items-center gap-3">
              {SIZE_OPTIONS.filter(s => s.value !== "custom").map(s => (
                <div
                  key={s.value}
                  className={`rounded-lg border flex items-center justify-center text-[10px] font-medium transition-all cursor-pointer ${boxSize === s.value ? "border-primary ring-2 ring-primary/30 text-primary" : "border-border text-muted-foreground"}`}
                  style={{
                    width: s.value === "small" ? 50 : s.value === "large" ? 90 : 70,
                    height: s.value === "small" ? 30 : s.value === "large" ? 50 : 40,
                    background: boxSize === s.value ? `linear-gradient(135deg, ${color1}, ${color2})` : undefined,
                    color: boxSize === s.value ? "white" : undefined,
                  }}
                  onClick={() => {
                    setBoxSize(s.value);
                    if (s.value === "small") { setBoxWidth("160"); setBoxHeight("44"); setBoxPadding("12"); setBoxFontSize("12"); setBoxBorderRadius("8"); setBoxLogoSize("28"); }
                    if (s.value === "medium") { setBoxWidth("200"); setBoxHeight("60"); setBoxPadding("16"); setBoxFontSize("14"); setBoxBorderRadius("12"); setBoxLogoSize("44"); }
                    if (s.value === "large") { setBoxWidth("280"); setBoxHeight("76"); setBoxPadding("20"); setBoxFontSize("16"); setBoxBorderRadius("16"); setBoxLogoSize("56"); }
                  }}
                >
                  {s.label}
                </div>
              ))}
            </div>
          </div>

          {/* Font Size & Logo Size sliders - prominent */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-border">
            <div className="space-y-2 p-3 rounded-lg bg-accent/30 border border-border">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold text-foreground">Font Size</Label>
                <span className="text-sm font-bold text-primary">{boxFontSize}px</span>
              </div>
              <Slider
                min={8} max={24} step={1}
                value={[parseInt(boxFontSize) || 14]}
                onValueChange={([v]) => { setBoxFontSize(String(v)); setBoxSize("custom"); }}
                className="w-full"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>8px (Small)</span><span>16px (Normal)</span><span>24px (Large)</span>
              </div>
            </div>
            <div className="space-y-2 p-3 rounded-lg bg-accent/30 border border-border">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold text-foreground">Logo Size</Label>
                <span className="text-sm font-bold text-primary">{boxLogoSize}px</span>
              </div>
              <Slider
                min={16} max={80} step={2}
                value={[parseInt(boxLogoSize) || 44]}
                onValueChange={([v]) => { setBoxLogoSize(String(v)); setBoxSize("custom"); }}
                className="w-full"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>16px (Tiny)</span><span>44px (Normal)</span><span>80px (Large)</span>
              </div>
            </div>
          </div>

          {/* Manual custom fields */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-2 border-t border-border">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Width (px)</Label>
              <Input type="number" min="100" max="500" value={boxWidth}
                onChange={(e) => { setBoxWidth(e.target.value); setBoxSize("custom"); }}
                className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Height (px)</Label>
              <Input type="number" min="30" max="200" value={boxHeight}
                onChange={(e) => { setBoxHeight(e.target.value); setBoxSize("custom"); }}
                className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Padding (px)</Label>
              <Input type="number" min="4" max="40" value={boxPadding}
                onChange={(e) => { setBoxPadding(e.target.value); setBoxSize("custom"); }}
                className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Border Radius (px)</Label>
              <Input type="number" min="0" max="30" value={boxBorderRadius}
                onChange={(e) => { setBoxBorderRadius(e.target.value); setBoxSize("custom"); }}
                className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Font Size (px)</Label>
              <Input type="number" min="8" max="24" value={boxFontSize}
                onChange={(e) => { setBoxFontSize(e.target.value); setBoxSize("custom"); }}
                className="h-8 text-sm" />
            </div>
          </div>

          {/* Live preview with current values */}
          <div className="pt-2">
            <p className="text-xs text-muted-foreground mb-2">Live Preview (with sample logo):</p>
            <div
              className="inline-flex items-center border border-foreground/5"
              style={{
                minWidth: `${boxWidth}px`,
                minHeight: `${boxHeight}px`,
                padding: `${boxPadding}px`,
                borderRadius: `${boxBorderRadius}px`,
                background: `linear-gradient(135deg, ${color1}, ${color2})`,
              }}
            >
              {/* Sample logo placeholder */}
              <div
                className="shrink-0 mr-2 rounded bg-white/20 flex items-center justify-center text-white/70 font-bold"
                style={{ width: `${boxLogoSize}px`, height: `${boxLogoSize}px`, fontSize: `${Math.max(parseInt(boxLogoSize) / 3, 8)}px` }}
              >
                ★
              </div>
              <div className="flex flex-col gap-0.5 flex-1 mr-3">
                <span className="font-semibold text-white truncate" style={{ fontSize: `${boxFontSize}px` }}>SampleUser</span>
                <span className="text-white/60 truncate" style={{ fontSize: `${Math.max(parseInt(boxFontSize) - 4, 8)}px` }}>PrimeWall</span>
              </div>
              <span className="font-bold text-white whitespace-nowrap" style={{ fontSize: `${Math.min(parseInt(boxFontSize) + 4, 24)}px` }}>150 pts</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity Type Toggles with per-type count */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Activity Type Visibility & Limits</CardTitle>
            <Badge variant="outline" className="text-xs">{enabledCount} of {FEED_TOGGLES.length} enabled</Badge>
          </div>
          <p className="text-xs text-muted-foreground">Toggle types and set how many items of each type to show.</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FEED_TOGGLES.map(t => {
              const isEnabled = toggles[t.key] ?? false;
              return (
                <div key={t.key} className="flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:border-primary/30 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{t.label}</p>
                    <p className="text-xs text-muted-foreground">{t.desc}</p>
                    {isEnabled && (
                      <div className="mt-2">
                        <Select
                          value={counts[t.countKey] || DEFAULT_PER_TYPE_COUNT}
                          onValueChange={(v) => setCounts(prev => ({ ...prev, [t.countKey]: v }))}
                        >
                          <SelectTrigger className="w-[120px] h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {COUNT_OPTIONS.map(v => (
                              <SelectItem key={v} value={v}>Show {v}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                  <Switch
                    checked={isEnabled}
                    onCheckedChange={(checked) => setToggles(prev => ({ ...prev, [t.key]: checked }))}
                  />
                </div>
              );
            })}
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
          <p className="text-xs text-muted-foreground">Pick two colors to create a gradient background for each activity ticker box</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-sm text-foreground">Color 1 (Start)</Label>
              <div className="flex items-center gap-3">
                <input type="color" value={color1} onChange={(e) => setColor1(e.target.value)}
                  className="w-12 h-10 rounded-lg border border-border cursor-pointer bg-transparent" />
                <Input value={color1} onChange={(e) => setColor1(e.target.value)}
                  className="flex-1 font-mono text-sm" placeholder="#1e293b" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-foreground">Color 2 (End)</Label>
              <div className="flex items-center gap-3">
                <input type="color" value={color2} onChange={(e) => setColor2(e.target.value)}
                  className="w-12 h-10 rounded-lg border border-border cursor-pointer bg-transparent" />
                <Input value={color2} onChange={(e) => setColor2(e.target.value)}
                  className="flex-1 font-mono text-sm" placeholder="#334155" />
              </div>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-xs text-muted-foreground mb-2">Preview:</p>
            <div className="rounded-xl px-4 py-3 border border-foreground/5 flex items-center gap-3"
              style={{ background: `linear-gradient(135deg, ${color1}, ${color2})` }}>
              <div className="flex flex-col gap-0.5 flex-1">
                <span className="text-sm font-semibold text-white">SampleUser</span>
                <span className="text-xs text-white/60">PrimeWall</span>
              </div>
              <span className="text-lg font-bold text-white">150 pts</span>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button size="sm" disabled={saving} onClick={async () => {
              setSaving(true);
              await upsertSettings([
                { key: COLOR1_KEY, value: color1 },
                { key: COLOR2_KEY, value: color2 },
              ]);
              setSaving(false);
              toast.success("Ticker box colors applied!");
            }}>
              <Palette className="h-4 w-4 mr-1" /> Apply Colors
            </Button>
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
            <Slider value={[speed]} onValueChange={([v]) => setSpeed(v)} min={20} max={240} step={10} className="w-full" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>⚡ Very Fast (20s)</span>
              <span>Normal (120s)</span>
              <span>🐢 Very Slow (240s)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feed Generator */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Play className="h-5 w-5 text-primary" />
            Feed Generator
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Generate simulated activity items that appear in the live feed. Fill in at least one entry with all fields to enable the Run button.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {generatorEntries.map((entry, idx) => (
            <div key={idx} className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end p-3 rounded-lg border border-border bg-accent/20">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Username</Label>
                <Input
                  placeholder="e.g. JohnDoe"
                  value={entry.username}
                  onChange={(e) => {
                    const updated = [...generatorEntries];
                    updated[idx].username = e.target.value;
                    setGeneratorEntries(updated);
                  }}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Amount (pts)</Label>
                <Input
                  type="number"
                  placeholder="e.g. 150"
                  value={entry.amount}
                  onChange={(e) => {
                    const updated = [...generatorEntries];
                    updated[idx].amount = e.target.value;
                    setGeneratorEntries(updated);
                  }}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Offerwall</Label>
                <Input
                  placeholder="e.g. PrimeWall"
                  value={entry.offerwall}
                  onChange={(e) => {
                    const updated = [...generatorEntries];
                    updated[idx].offerwall = e.target.value;
                    setGeneratorEntries(updated);
                  }}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Country</Label>
                <Input
                  placeholder="e.g. US"
                  value={entry.country}
                  onChange={(e) => {
                    const updated = [...generatorEntries];
                    updated[idx].country = e.target.value;
                    setGeneratorEntries(updated);
                  }}
                  className="h-8 text-sm"
                />
              </div>
              <div className="flex items-end gap-2">
                {generatorEntries.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => setGeneratorEntries(generatorEntries.filter((_, i) => i !== idx))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setGeneratorEntries([...generatorEntries, { username: "", amount: "", offerwall: "", country: "" }])}
            >
              <Plus className="h-4 w-4 mr-1" /> Add Entry
            </Button>

            <Button
              size="sm"
              disabled={generatorRunning || !generatorEntries.some(e => e.username && e.amount && e.offerwall && e.country)}
              onClick={async () => {
                const validEntries = generatorEntries.filter(e => e.username && e.amount && e.offerwall && e.country);
                if (validEntries.length === 0) {
                  toast.error("Please fill in all fields for at least one entry");
                  return;
                }

                setGeneratorRunning(true);
                try {
                  // Get or create a placeholder user to attach earnings to
                  const { data: adminUser } = await supabase.auth.getUser();
                  const userId = adminUser?.user?.id;
                  if (!userId) {
                    toast.error("You must be logged in to generate feed items");
                    setGeneratorRunning(false);
                    return;
                  }

                  for (const entry of validEntries) {
                    await supabase.from("earning_history").insert({
                      user_id: userId,
                      amount: parseFloat(entry.amount) || 0,
                      offer_name: entry.offerwall,
                      description: `Feed Generator: ${entry.username} earned from ${entry.offerwall}`,
                      status: "approved",
                      type: "feed_generator",
                    });
                  }

                  toast.success(`Generated ${validEntries.length} feed item(s) successfully!`);
                  setGeneratorEntries([{ username: "", amount: "", offerwall: "", country: "" }]);
                } catch (err) {
                  toast.error("Failed to generate feed items");
                } finally {
                  setGeneratorRunning(false);
                }
              }}
              className="bg-primary hover:bg-primary/90"
            >
              <Play className="h-4 w-4 mr-1" /> {generatorRunning ? "Running..." : "Run Generator"}
            </Button>
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
