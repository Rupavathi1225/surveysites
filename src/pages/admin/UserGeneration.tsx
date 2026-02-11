import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { User, Upload, Sparkles, Clock, UserPlus, Loader2 } from "lucide-react";

type Tab = "manual" | "bulk" | "ai";

const UserGeneration = () => {
  const [tab, setTab] = useState<Tab>("manual");
  const [activityScheduling, setActivityScheduling] = useState(true);
  const [generatedUsers, setGeneratedUsers] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);

  // Manual
  const [baseName, setBaseName] = useState("");
  const [userCount, setUserCount] = useState(10);
  const [country, setCountry] = useState("India");
  const [timeGap, setTimeGap] = useState(20);

  // Bulk
  const [manualUsernames, setManualUsernames] = useState("");
  const [bulkCount, setBulkCount] = useState(30);

  // AI
  const [usernameStyle, setUsernameStyle] = useState("Modern");
  const [letters, setLetters] = useState(4);
  const [numbers, setNumbers] = useState(5);
  const [shuffleAfter, setShuffleAfter] = useState(2);
  const [aiCount, setAiCount] = useState(50);

  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  };

  const generateUsername = (base: string) => {
    const suffix = Math.floor(1000 + Math.random() * 9000);
    return `${base}${suffix}`;
  };

  const generateAIUsername = () => {
    const letterPart = Array.from({ length: letters }, () => "abcdefghijklmnopqrstuvwxyz"[Math.floor(Math.random() * 26)]).join("");
    const numberPart = Array.from({ length: numbers }, () => Math.floor(Math.random() * 10)).join("");
    const combined = letterPart + numberPart;
    if (shuffleAfter > 0) {
      const arr = combined.split("");
      for (let i = arr.length - 1; i > shuffleAfter; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr.join("");
    }
    return combined;
  };

  const createUsers = async (usernames: string[]) => {
    setGenerating(true);
    try {
      const users = usernames.map(username => ({
        username,
        email: `${username.toLowerCase().replace(/[^a-z0-9]/g, "")}${Math.floor(Math.random() * 999)}@generated.local`,
        password: generatePassword(),
      }));

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) {
        toast({ title: "Not authenticated", variant: "destructive" });
        setGenerating(false);
        return;
      }

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-users`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          users,
          country,
          activityScheduling,
          timeGap,
        }),
      });

      const result = await res.json();
      if (result.error) {
        toast({ title: result.error, variant: "destructive" });
      } else {
        // Match passwords back from our local list
        const createdWithPasswords = result.created.map((c: any) => {
          const original = users.find(u => u.username === c.username);
          return { ...c, password: original?.password || c.password };
        });
        setGeneratedUsers(prev => [...createdWithPasswords, ...prev]);
        toast({ title: `${result.total} users generated!` });
        if (result.errors?.length > 0) {
          console.warn("User creation errors:", result.errors);
        }
      }
    } catch (err: any) {
      toast({ title: "Failed to generate users", description: err.message, variant: "destructive" });
    }
    setGenerating(false);
  };

  const handleManualGenerate = () => {
    if (!baseName.trim()) { toast({ title: "Enter a base username", variant: "destructive" }); return; }
    const usernames = Array.from({ length: userCount }, () => generateUsername(baseName));
    createUsers(usernames);
  };

  const handleBulkGenerate = () => {
    let usernames: string[] = [];
    if (manualUsernames.trim()) {
      usernames = manualUsernames.split("\n").map(u => u.trim()).filter(Boolean);
    }
    if (usernames.length === 0) { toast({ title: "Enter usernames", variant: "destructive" }); return; }
    createUsers(usernames.slice(0, bulkCount));
  };

  const handleAIGenerate = () => {
    const usernames = Array.from({ length: aiCount }, () => generateAIUsername());
    createUsers(usernames);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split("\n").map(l => l.split(",")[0]?.trim()).filter(Boolean);
      setManualUsernames(lines.join("\n"));
      setBulkCount(lines.length);
    };
    reader.readAsText(file);
  };

  const tabs = [
    { id: "manual" as Tab, icon: User, label: "Manual" },
    { id: "bulk" as Tab, icon: Upload, label: "Bulk" },
    { id: "ai" as Tab, icon: Sparkles, label: "AI" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">User Generation</h1>
        <p className="text-sm text-muted-foreground">Create users with controlled activity scheduling</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Generation Methods</CardTitle>
            <p className="text-sm text-muted-foreground">Choose how to create users</p>
            <div className="flex items-center justify-between p-3 bg-accent/40 rounded-lg mt-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-medium">Activity Scheduling</p>
                  <p className="text-xs text-muted-foreground">Users appear gradually in activity feed</p>
                </div>
              </div>
              <Switch checked={activityScheduling} onCheckedChange={setActivityScheduling} />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex bg-accent/40 rounded-lg p-1">
              {tabs.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm rounded-md transition-colors ${tab === t.id ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                  <t.icon className="h-4 w-4" /> {t.label}
                </button>
              ))}
            </div>

            {tab === "manual" && (
              <div className="space-y-4">
                <div><label className="text-sm font-medium">Base Username</label><Input value={baseName} onChange={e => setBaseName(e.target.value)} placeholder="e.g., suraj" />
                  <p className="text-xs text-muted-foreground mt-1">Will generate: suraj5023, suraj8471, etc.</p>
                </div>
                <div><label className="text-sm font-medium">Number of Users: {userCount}</label><Slider value={[userCount]} onValueChange={v => setUserCount(v[0])} min={1} max={100} step={1} /></div>
                <div><label className="text-sm font-medium">Country</label>
                  <Select value={country} onValueChange={setCountry}><SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="India">India</SelectItem><SelectItem value="US">US</SelectItem><SelectItem value="UK">UK</SelectItem><SelectItem value="Canada">Canada</SelectItem></SelectContent>
                  </Select>
                </div>
                {activityScheduling && (
                  <div><label className="text-sm font-medium flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Time Gap: {timeGap} minutes</label>
                    <Slider value={[timeGap]} onValueChange={v => setTimeGap(v[0])} min={1} max={120} step={1} />
                    <p className="text-xs text-muted-foreground mt-1">User 1 at now, User 2 after {timeGap} mins, User 3 after {timeGap * 2} mins...</p>
                  </div>
                )}
                <Button onClick={handleManualGenerate} disabled={generating} className="w-full">
                  {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <UserPlus className="h-4 w-4 mr-2" />}
                  Generate {userCount} Users
                </Button>
              </div>
            )}

            {tab === "bulk" && (
              <div className="space-y-4">
                <div><label className="text-sm font-medium flex items-center gap-1">📄 Upload CSV File</label>
                  <Input type="file" accept=".csv,.txt" onChange={handleFileUpload} />
                </div>
                <div className="text-center text-xs text-muted-foreground">— OR ENTER MANUALLY —</div>
                <div><label className="text-sm font-medium">Usernames (one per line)</label>
                  <Textarea value={manualUsernames} onChange={e => setManualUsernames(e.target.value)} placeholder={"suraj\nsuresh\nsanjay"} rows={5} />
                </div>
                <div><label className="text-sm font-medium">Max Users: {bulkCount}</label><Slider value={[bulkCount]} onValueChange={v => setBulkCount(v[0])} min={1} max={200} step={1} /></div>
                <div><label className="text-sm font-medium">Country</label>
                  <Select value={country} onValueChange={setCountry}><SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="India">India</SelectItem><SelectItem value="US">US</SelectItem><SelectItem value="UK">UK</SelectItem><SelectItem value="Canada">Canada</SelectItem></SelectContent>
                  </Select>
                </div>
                {activityScheduling && (
                  <div><label className="text-sm font-medium flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Time Gap: {timeGap} minutes</label>
                    <Slider value={[timeGap]} onValueChange={v => setTimeGap(v[0])} min={1} max={120} step={1} />
                  </div>
                )}
                <Button onClick={handleBulkGenerate} disabled={generating} className="w-full">
                  {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                  Generate Users from List
                </Button>
              </div>
            )}

            {tab === "ai" && (
              <div className="space-y-4">
                <div><label className="text-sm font-medium">Username Style</label>
                  <Select value={usernameStyle} onValueChange={setUsernameStyle}><SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="Modern">Modern</SelectItem><SelectItem value="Classic">Classic</SelectItem><SelectItem value="Gaming">Gaming</SelectItem><SelectItem value="Professional">Professional</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-sm font-medium">Letters: {letters}</label><Slider value={[letters]} onValueChange={v => setLetters(v[0])} min={2} max={10} step={1} /></div>
                  <div><label className="text-sm font-medium">Numbers: {numbers}</label><Slider value={[numbers]} onValueChange={v => setNumbers(v[0])} min={0} max={10} step={1} /></div>
                </div>
                <div><label className="text-sm font-medium">Shuffle After: {shuffleAfter} characters</label><Slider value={[shuffleAfter]} onValueChange={v => setShuffleAfter(v[0])} min={0} max={10} step={1} /></div>
                <div><label className="text-sm font-medium">Total Users: {aiCount}</label><Slider value={[aiCount]} onValueChange={v => setAiCount(v[0])} min={1} max={200} step={1} /></div>
                <div><label className="text-sm font-medium">Country</label>
                  <Select value={country} onValueChange={setCountry}><SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="India">India</SelectItem><SelectItem value="US">US</SelectItem><SelectItem value="UK">UK</SelectItem><SelectItem value="Canada">Canada</SelectItem></SelectContent>
                  </Select>
                </div>
                {activityScheduling && (
                  <div><label className="text-sm font-medium flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Time Gap: {timeGap} minutes</label>
                    <Slider value={[timeGap]} onValueChange={v => setTimeGap(v[0])} min={1} max={120} step={1} />
                  </div>
                )}
                <Button onClick={handleAIGenerate} disabled={generating} className="w-full">
                  {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                  Generate {aiCount} AI Users
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">✅ Generated Users</CardTitle>
            <p className="text-sm text-muted-foreground">Users will appear here after generation</p>
          </CardHeader>
          <CardContent>
            {generatedUsers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <User className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No users generated yet</p>
                <p className="text-xs">Choose a method and generate users</p>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto space-y-2">
                {generatedUsers.map((u, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-accent/40 rounded-lg text-sm">
                    <div>
                      <p className="font-medium">{u.username}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                    <p className="text-xs font-mono text-muted-foreground">{u.password}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
export default UserGeneration;