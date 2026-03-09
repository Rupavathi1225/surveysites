import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, Bell, Gift, Settings2, Play } from "lucide-react";

const AdminNotifications = () => {
  const [items, setItems] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [surveyProviders, setSurveyProviders] = useState<any[]>([]);

  const [openNotif, setOpenNotif] = useState(false);
  const [notifForm, setNotifForm] = useState({
    is_global: false, user_id: "", type: "announcement", title: "", message: "",
    repeat: false, repeat_count: 1, time_gap: 0,
  });

  const [openOffer, setOpenOffer] = useState(false);
  const [offerForm, setOfferForm] = useState({
    user_id: "", offer_id: "", points: "", custom_title: "", custom_message: "",
    repeat: false, repeat_count: 1, time_gap: 0,
  });

  // Feed Generator States
  const [openFeedGenerator, setOpenFeedGenerator] = useState(false);
  const [feedGeneratorEnabled, setFeedGeneratorEnabled] = useState(false);
  const [feedGeneratorForm, setFeedGeneratorForm] = useState({
    selectedUsers: [] as string[],
    selectedOffers: [] as string[],
    selectedSurveyProviders: [] as string[],
    selectedCountry: "",
    points: "50",
    count: 5,
    interval: 10,
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationLogs, setGenerationLogs] = useState<any[]>([]);
  
  // Search states
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [offerSearchTerm, setOfferSearchTerm] = useState("");
  const [surveyProviderSearchTerm, setSurveyProviderSearchTerm] = useState("");

  const load = () => {
    Promise.all([
      supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("profiles").select("id, username, email"),
      supabase.from("offers").select("*"), // Get all offers first to debug
      supabase.from("survey_providers").select("*"), // Fetch survey providers
    ]).then(([notifRes, usersRes, offersRes, surveyProvidersRes]) => {
      setItems(notifRes.data || []);
      setUsers(usersRes.data || []);
      
      console.log('🔍 All offers from database:', offersRes.data);
      console.log('🔍 Offers count:', offersRes.data?.length || 0);
      
      // Debug: Check what status values actually exist
      const statusValues = offersRes.data?.map(o => `${o.title} - status: "${o.status}"`) || [];
      console.log('📊 Status values found:', statusValues);
      
      // Count offers by status
      const statusCounts = {};
      offersRes.data?.forEach(offer => {
        statusCounts[offer.status] = (statusCounts[offer.status] || 0) + 1;
      });
      console.log('📈 Status counts:', statusCounts);
      
      // Filter to only show active offers in Feed Generator
      const activeOffers = (offersRes.data || []).filter(offer => {
        console.log(`🔍 Checking offer: ${offer.title} - status: "${offer.status}" - is active: ${offer.status === "active"}`);
        return offer.status === "active";
      });
      console.log('✅ Active offers filtered:', activeOffers);
      console.log('✅ Active offers count:', activeOffers.length);
      
      setOffers(activeOffers);
      
      // Set survey providers
      console.log('🔍 Survey providers from database:', surveyProvidersRes.data);
      console.log('🔍 Survey providers count:', surveyProvidersRes.data?.length || 0);
      setSurveyProviders(surveyProvidersRes.data || []);
    });
  };
  useEffect(() => { load(); }, []);

  // Feed Generator Functions
  const generateFeedActivity = async () => {
    if (feedGeneratorForm.selectedUsers.length === 0 && feedGeneratorForm.selectedOffers.length === 0 && feedGeneratorForm.selectedSurveyProviders.length === 0) {
      toast({ title: "Selection Required", description: "Select a user, offer, or survey provider", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    const startTime = new Date();
    let generatedCount = 0;

    try {
      for (let i = 0; i < feedGeneratorForm.count; i++) {
        console.log(`🚀 Starting activity ${i + 1}/${feedGeneratorForm.count} at ${new Date().toLocaleTimeString()}`);
        
        // Select user and offer/survey provider (multiple selections from dropdowns)
        const selectedUsers = feedGeneratorForm.selectedUsers;
        const selectedOffers = feedGeneratorForm.selectedOffers;
        const selectedSurveyProviders = feedGeneratorForm.selectedSurveyProviders;
        
        const randomUser = selectedUsers.length > 0 
          ? users.find(u => selectedUsers.includes(u.id))
          : users[Math.floor(Math.random() * users.length)];
        
        // Randomly choose between offer and survey provider
        let selectedActivity = null;
        let activityType = '';
        
        if (selectedOffers.length > 0 && selectedSurveyProviders.length > 0) {
          // Both available, randomly choose
          if (Math.random() > 0.5) {
            selectedActivity = offers.find(o => selectedOffers.includes(o.id));
            activityType = 'offer';
          } else {
            selectedActivity = surveyProviders.find(sp => selectedSurveyProviders.includes(sp.id));
            activityType = 'survey_provider';
          }
        } else if (selectedOffers.length > 0) {
          // Only offers available
          selectedActivity = offers.find(o => selectedOffers.includes(o.id));
          activityType = 'offer';
        } else if (selectedSurveyProviders.length > 0) {
          // Only survey providers available
          selectedActivity = surveyProviders.find(sp => selectedSurveyProviders.includes(sp.id));
          activityType = 'survey_provider';
        } else {
          // Random selection from all available
          const allActivities = [...offers, ...surveyProviders];
          selectedActivity = allActivities[Math.floor(Math.random() * allActivities.length)];
          activityType = offers.some(o => o.id === selectedActivity.id) ? 'offer' : 'survey_provider';
        }

        if (randomUser && selectedActivity) {
          const activityName = activityType === 'offer' ? selectedActivity.title : (selectedActivity.name || selectedActivity.title);
          const username = randomUser.username || randomUser.email || "User";
          const country = feedGeneratorForm.selectedCountry || "US";
          
          // Insert into earning_history for activity feed
          const insertResult = await supabase.from("earning_history").insert({
            user_id: randomUser.id,
            amount: parseFloat(feedGeneratorForm.points) || 0,
            offer_name: activityName,
            description: `Feed Generator: ${username} earned from ${activityName} [${country}]`,
            status: "approved",
            type: "feed_generator",
          });

          if (insertResult.error) {
            console.error('❌ Error inserting feed activity:', insertResult.error);
          } else {
            console.log('✅ Feed activity inserted successfully:', insertResult.data);
          }
          
          generatedCount++;
        }

        // Wait for interval before next activity (except for last one)
        if (i < feedGeneratorForm.count - 1) {
          console.log(`⏰ Waiting ${feedGeneratorForm.interval} seconds before next activity...`);
          await new Promise(resolve => setTimeout(resolve, feedGeneratorForm.interval * 1000));
          console.log(`⏰ Wait completed, starting next activity at ${new Date().toLocaleTimeString()}`);
        }
      }

      const endTime = new Date();
      const duration = Math.round((endTime.getTime() - startTime.getTime()) / 1000);
      
      // Format dates properly
      const formattedStartTime = startTime.toLocaleString("en-US", { 
        month: "short", 
        day: "numeric", 
        year: "numeric", 
        hour: "2-digit", 
        minute: "2-digit", 
        second: "2-digit",
        hour12: true 
      });
      
      const formattedEndTime = endTime.toLocaleString("en-US", { 
        month: "short", 
        day: "numeric", 
        year: "numeric", 
        hour: "2-digit", 
        minute: "2-digit", 
        second: "2-digit",
        hour12: true 
      });
      
      const logEntry = {
        id: Date.now().toString(),
        start: formattedStartTime,
        end: formattedEndTime,
        total: generatedCount,
        users: feedGeneratorForm.selectedUsers.length || 1,
        offers: feedGeneratorForm.selectedOffers.length || 1,
        surveyProviders: feedGeneratorForm.selectedSurveyProviders.length || 1,
        points: parseInt(feedGeneratorForm.points) * generatedCount,
        interval: feedGeneratorForm.interval,
        duration: duration,
      };
      
      console.log('📊 Final log entry:', logEntry);
      
      // Add to generation logs
      setGenerationLogs(prev => [logEntry, ...prev]);
      
      // Create admin notification for Feed Generator completion with proper formatting
      const adminLogMessage = `Feed Generator completed: ${logEntry.total} activities generated in ${logEntry.duration}s. Users: ${logEntry.users}, Offers: ${logEntry.offers}, Survey Providers: ${logEntry.surveyProviders}, Points: ${logEntry.points}, Interval: ${logEntry.interval}s`;
      
      const adminLogResult = await supabase.from("notifications").insert({
        type: "announcement",
        message: adminLogMessage,
        is_global: true,
        user_id: null, // System notification
      });
      
      if (adminLogResult.error) {
        console.error('❌ Error inserting admin log notification:', adminLogResult.error);
      } else {
        console.log('✅ Admin log notification inserted successfully:', adminLogResult.data);
      }

      // Wait a moment for database operations to complete, then reload notifications
      setTimeout(() => {
        load();
        console.log('🔄 Notifications reloaded after Feed Generator completion');
      }, 1000);

      toast({ 
        title: "Feed Generated Successfully", 
        description: `Generated ${generatedCount} activities in ${feedGeneratorForm.count * feedGeneratorForm.interval} seconds` 
      });

    } catch (error) {
      toast({ title: "Generation Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const getUser = (id: string) => users.find(u => u.id === id);

  // Send regular notification with REAL scheduled timing using setTimeout
  const sendNotification = async () => {
    if (!notifForm.title.trim() || !notifForm.message.trim()) return;
    const count = notifForm.repeat ? Math.max(1, notifForm.repeat_count) : 1;
    const gap = notifForm.repeat ? Math.max(0, notifForm.time_gap) : 0;

    // Insert first one immediately
    const payload: any = {
      type: notifForm.type,
      message: `${notifForm.title}: ${notifForm.message}`,
      is_global: notifForm.is_global,
    };
    if (!notifForm.is_global && notifForm.user_id) payload.user_id = notifForm.user_id;

    const { error } = await supabase.from("notifications").insert(payload);
    if (error) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
      return;
    }

    // Schedule remaining ones with real delays
    if (count > 1 && gap > 0) {
      for (let i = 1; i < count; i++) {
        const delayMs = gap * 60000 * i;
        setTimeout(async () => {
          await supabase.from("notifications").insert(payload);
        }, delayMs);
      }
      toast({ title: `First sent! ${count - 1} more scheduled every ${gap} min` });
    } else if (count > 1) {
      // No gap, insert all with staggered created_at
      for (let i = 1; i < count; i++) {
        await supabase.from("notifications").insert(payload);
      }
      toast({ title: `Sent ${count} notifications!` });
    } else {
      toast({ title: "Notification sent!" });
    }

    setOpenNotif(false);
    setNotifForm({ is_global: false, user_id: "", type: "announcement", title: "", message: "", repeat: false, repeat_count: 1, time_gap: 0 });
    load();
  };

  // Send offer notification with REAL scheduled timing
  const sendOfferNotification = async () => {
    if (!offerForm.user_id || !offerForm.points) return;
    const user = getUser(offerForm.user_id);
    const offer = offers.find(o => o.id === offerForm.offer_id);
    const count = offerForm.repeat ? Math.max(1, offerForm.repeat_count) : 1;
    const gap = offerForm.repeat ? Math.max(0, offerForm.time_gap) : 0;

    const title = offerForm.custom_title || `Offer Completed: ${offer?.title || "Manual Offer"}`;
    const message = offerForm.custom_message || `✅ ${user?.username || user?.email} completed ${offer?.title || "an offer"} and earned ${offerForm.points} points`;

    const insertPayload = {
      type: "offer_completed",
      message: `${title} — ${message}`,
      is_global: true,
      user_id: offerForm.user_id,
    };

    const { error } = await supabase.from("notifications").insert(insertPayload);
    if (error) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
      return;
    }

    // Schedule remaining with real delays
    if (count > 1 && gap > 0) {
      for (let i = 1; i < count; i++) {
        const delayMs = gap * 60000 * i;
        setTimeout(async () => {
          await supabase.from("notifications").insert(insertPayload);
        }, delayMs);
      }
      toast({ title: `First sent! ${count - 1} more will appear every ${gap} min` });
    } else if (count > 1) {
      for (let i = 1; i < count; i++) {
        await supabase.from("notifications").insert(insertPayload);
      }
      toast({ title: `Sent ${count} offer notifications!` });
    } else {
      toast({ title: "Offer notification sent!" });
    }

    setOpenOffer(false);
    setOfferForm({ user_id: "", offer_id: "", points: "", custom_title: "", custom_message: "", repeat: false, repeat_count: 1, time_gap: 0 });
    load();
  };

  const del = async (id: string) => {
    await supabase.from("notifications").delete().eq("id", id);
    toast({ title: "Notification deleted" });
    load();
  };

  // State for expanded notifications
  const [expandedNotifications, setExpandedNotifications] = useState<Set<string>>(new Set());

  const toggleNotificationExpansion = (id: string) => {
    setExpandedNotifications(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Function to extract admin log details from message
const extractAdminLogDetails = (message: string): { summary: string; details: string } => {
  if (!message || !message.includes("Feed Generator completed")) {
    return { summary: message, details: "" };
  }
  
  // Extract the main summary (first part before details)
  const summaryMatch = message.match(/^(.+?)(\d+ activities generated in \d+s)/);
  const summary = summaryMatch ? `${summaryMatch[1]}${summaryMatch[2]}` : message.substring(0, 100) + "...";
  
  // Extract detailed information
  const details = message
    .replace(/^Feed Generator completed: \d+ activities generated in \d+s\.?\s*/, "")
    .trim();
  
  return { summary, details };
};

  const truncateMessage = (message: string, maxLength: number = 60) => {
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength) + "...";
  };

  const getTypeIcon = (type: string) => {
    const map: Record<string, string> = {
      signup: "🎉", offer_completed: "✅", promo_redeemed: "🎁", promo_added: "🔥",
      offer_added: "🆕", credits: "💰", payment_requested: "💸", payment_completed: "✅", announcement: "📢", login: "👋", survey_completed: "✅",
    };
    return map[type] || "📢";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-sm text-muted-foreground">Send notifications to users with scheduling</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setOpenFeedGenerator(true)}>
            <Settings2 className="h-4 w-4 mr-2" /> Generate Activity Feed
          </Button>
          <Button variant="outline" onClick={() => setOpenOffer(true)}>
            <Gift className="h-4 w-4 mr-2" /> Offer Notification
          </Button>
          <Button onClick={() => setOpenNotif(true)}>
            <Plus className="h-4 w-4 mr-2" /> Send Notification
          </Button>
        </div>
      </div>

      {/* Activity Feed Controls removed - moved to Admin Dashboard */}

      {/* Sent Notifications Table */}
      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Bell className="h-4 w-4" /> Sent Notifications ({items.length})
            </h3>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Repeat</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No notifications</TableCell></TableRow>
              ) : items.map(n => {
                const user = n.user_id ? getUser(n.user_id) : null;
                return (
                  <TableRow key={n.id}>
                    <TableCell className="max-w-xs">
                      <div className="space-y-1">
                        <div className="text-sm">
                          {getTypeIcon(n.type)} {expandedNotifications.has(n.id) ? 
                            (n.type === "announcement" && n.message?.includes("Feed Generator completed") ? 
                              "Feed Generator activity completed" : 
                              n.message) : 
                            (n.type === "announcement" && n.message?.includes("Feed Generator completed") ? 
                              "Feed Generator activity completed" : 
                              truncateMessage(n.message || "", 60))
                          }
                        </div>
                        {(n.message?.length || 0) > 60 || (n.type === "announcement" && n.message?.includes("Feed Generator completed")) ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleNotificationExpansion(n.id)}
                            className="h-6 px-2 text-xs text-blue-600 hover:text-blue-700"
                          >
                            {expandedNotifications.has(n.id) ? "Show Less" : "View More"}
                          </Button>
                        ) : null}
                        {expandedNotifications.has(n.id) && n.type === "announcement" && n.message?.includes("Feed Generator completed") && (
                          <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-700 border border-gray-200">
                            <div className="font-semibold mb-1">📊 Feed Generator Details:</div>
                            <div className="space-y-1">
                              {extractAdminLogDetails(n.message || "").details.split(', ').map((detail, index) => (
                                <div key={index} className="flex items-center gap-1">
                                  <span className="text-gray-500">•</span>
                                  <span>{detail}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{n.type}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">Once</TableCell>
                    <TableCell>
                      {n.is_global ? (
                        <Badge className="bg-primary/20 text-primary text-xs">Global</Badge>
                      ) : (
                        <span className="text-sm">{user?.username || user?.email || n.user_id?.slice(0, 8)}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(n.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => del(n.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Send Notification Dialog */}
      <Dialog open={openNotif} onOpenChange={setOpenNotif}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Send Notification</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Switch checked={notifForm.is_global} onCheckedChange={v => setNotifForm({ ...notifForm, is_global: v })} />
              <Label>Send to all users (Global)</Label>
            </div>
            {!notifForm.is_global && (
              <div>
                <Label className="text-sm">Select User</Label>
                <Select value={notifForm.user_id} onValueChange={v => setNotifForm({ ...notifForm, user_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Choose user" /></SelectTrigger>
                  <SelectContent>{users.map(u => (<SelectItem key={u.id} value={u.id}>{u.username || u.email || u.id.slice(0, 8)}</SelectItem>))}</SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label className="text-sm">Type</Label>
              <Select value={notifForm.type} onValueChange={v => setNotifForm({ ...notifForm, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="announcement">📢 Announcement</SelectItem>
                  <SelectItem value="credits">💰 Credits/System</SelectItem>
                  <SelectItem value="signup">🎉 Signup</SelectItem>
                  <SelectItem value="offer_completed">✅ Offer Completed</SelectItem>
                  <SelectItem value="promo_redeemed">🎁 Promo Redeemed</SelectItem>
                  <SelectItem value="promo_added">🔥 Promo Added</SelectItem>
                  <SelectItem value="offer_added">🆕 Offer Added</SelectItem>
                  <SelectItem value="payment_requested">💸 Payment Requested</SelectItem>
                  <SelectItem value="payment_completed">✅ Payment Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">Title *</Label>
              <Input value={notifForm.title} onChange={e => setNotifForm({ ...notifForm, title: e.target.value })} placeholder="Notification title" />
            </div>
            <div>
              <Label className="text-sm">Message *</Label>
              <Textarea value={notifForm.message} onChange={e => setNotifForm({ ...notifForm, message: e.target.value })} placeholder="Notification message..." rows={3} />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={notifForm.repeat} onCheckedChange={v => setNotifForm({ ...notifForm, repeat: v })} />
              <Label>Send Multiple Times (Repeat)</Label>
            </div>
            {notifForm.repeat && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm">Repeat Count</Label>
                  <Input type="number" min={1} value={notifForm.repeat_count} onChange={e => setNotifForm({ ...notifForm, repeat_count: Number(e.target.value) })} />
                  <p className="text-xs text-muted-foreground mt-1">How many times to send</p>
                </div>
                <div>
                  <Label className="text-sm">Time Gap (minutes)</Label>
                  <Input type="number" min={0} value={notifForm.time_gap} onChange={e => setNotifForm({ ...notifForm, time_gap: Number(e.target.value) })} />
                  <p className="text-xs text-muted-foreground mt-1">Minutes between each</p>
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpenNotif(false)}>Cancel</Button>
              <Button onClick={sendNotification}>{notifForm.repeat ? "Schedule" : "Send Notification"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Send Offer Notification Dialog */}
      <Dialog open={openOffer} onOpenChange={setOpenOffer}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Settings2 className="h-5 w-5" /> Send Offer Notification</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm">Select User *</Label>
              <Select value={offerForm.user_id} onValueChange={v => setOfferForm({ ...offerForm, user_id: v })}>
                <SelectTrigger><SelectValue placeholder="Choose user" /></SelectTrigger>
                <SelectContent>{users.map(u => (<SelectItem key={u.id} value={u.id}>{u.username || u.email || u.id.slice(0, 8)}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">Select Offer (or leave empty for manual)</Label>
              <Select value={offerForm.offer_id} onValueChange={v => {
                const offer = offers.find(o => o.id === v);
                setOfferForm({ ...offerForm, offer_id: v, points: offer?.payout?.toString() || offerForm.points });
              }}>
                <SelectTrigger><SelectValue placeholder="Choose offer" /></SelectTrigger>
                <SelectContent>
                  {offers.map(o => (
                    <SelectItem key={o.id} value={o.id}>{o.title} ({o.currency || "$"} {o.payout})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">Points *</Label>
              <Input type="number" value={offerForm.points} onChange={e => setOfferForm({ ...offerForm, points: e.target.value })} placeholder="e.g. 500" />
              <p className="text-xs text-muted-foreground mt-1">Enter points manually.</p>
            </div>
            <div>
              <Label className="text-sm">Custom Title (optional)</Label>
              <Input value={offerForm.custom_title} onChange={e => setOfferForm({ ...offerForm, custom_title: e.target.value })} placeholder="Override default title" />
            </div>
            <div>
              <Label className="text-sm">Custom Message (optional)</Label>
              <Textarea value={offerForm.custom_message} onChange={e => setOfferForm({ ...offerForm, custom_message: e.target.value })} placeholder="Override default message" rows={3} />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={offerForm.repeat} onCheckedChange={v => setOfferForm({ ...offerForm, repeat: v })} />
              <Label>Send Multiple Times (Repeat)</Label>
            </div>
            {offerForm.repeat && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm">Repeat Count</Label>
                  <Input type="number" min={1} value={offerForm.repeat_count} onChange={e => setOfferForm({ ...offerForm, repeat_count: Number(e.target.value) })} />
                </div>
                <div>
                  <Label className="text-sm">Time Gap (minutes)</Label>
                  <Input type="number" min={0} value={offerForm.time_gap} onChange={e => setOfferForm({ ...offerForm, time_gap: Number(e.target.value) })} />
                  <p className="text-xs text-muted-foreground mt-1">Each will appear after this delay</p>
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpenOffer(false)}>Cancel</Button>
              <Button onClick={sendOfferNotification}>{offerForm.repeat ? "Schedule Offer Notification" : "Send Offer Notification"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Feed Generator Dialog */}
      <Dialog open={openFeedGenerator} onOpenChange={setOpenFeedGenerator}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Feed Generator
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* User Selection */}
            <div>
              <Label className="text-sm font-medium">User Selection</Label>
              <div className="mt-2">
                <Input
                  placeholder="Search users..."
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  className="mb-2"
                />
                <div className="flex items-center justify-between mb-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const filteredUsers = users.filter(user => 
                        (user.username || "").toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                        (user.email || "").toLowerCase().includes(userSearchTerm.toLowerCase())
                      );
                      setFeedGeneratorForm({
                        ...feedGeneratorForm,
                        selectedUsers: filteredUsers.map(user => user.id)
                      });
                    }}
                  >
                    Select All ({users.filter(user => 
                      (user.username || "").toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                      (user.email || "").toLowerCase().includes(userSearchTerm.toLowerCase())
                    ).length})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFeedGeneratorForm({
                      ...feedGeneratorForm,
                      selectedUsers: []
                    })}
                  >
                    Clear All
                  </Button>
                </div>
                <div className="border rounded-md p-2 max-h-48 overflow-y-auto">
                  <div className="space-y-2">
                    {users
                      .filter(user => 
                        (user.username || "").toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                        (user.email || "").toLowerCase().includes(userSearchTerm.toLowerCase())
                      )
                      .map(user => (
                      <div key={user.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`user-${user.id}`}
                          checked={feedGeneratorForm.selectedUsers.includes(user.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFeedGeneratorForm({
                                ...feedGeneratorForm,
                                selectedUsers: [...feedGeneratorForm.selectedUsers, user.id]
                              });
                            } else {
                              setFeedGeneratorForm({
                                ...feedGeneratorForm,
                                selectedUsers: feedGeneratorForm.selectedUsers.filter(id => id !== user.id)
                              });
                            }
                          }}
                          className="rounded"
                        />
                        <Label htmlFor={`user-${user.id}`} className="text-sm cursor-pointer">
                          {user.username || user.email || user.id.slice(0, 8)}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Selected: {feedGeneratorForm.selectedUsers.length} users | Found: {users.filter(user => 
                  (user.username || "").toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                  (user.email || "").toLowerCase().includes(userSearchTerm.toLowerCase())
                ).length} users
              </p>
            </div>

            {/* Active Offers Dropdown */}
            <div>
              <Label className="text-sm font-medium">Active Offers</Label>
              <div className="mt-2">
                <Input
                  placeholder="Search offers..."
                  value={offerSearchTerm}
                  onChange={(e) => setOfferSearchTerm(e.target.value)}
                  className="mb-2"
                />
                <div className="flex items-center justify-between mb-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const filteredOffers = offers.filter(offer => 
                        offer.title.toLowerCase().includes(offerSearchTerm.toLowerCase())
                      );
                      setFeedGeneratorForm({
                        ...feedGeneratorForm,
                        selectedOffers: filteredOffers.map(offer => offer.id)
                      });
                    }}
                  >
                    Select All ({offers.filter(offer => 
                      offer.title.toLowerCase().includes(offerSearchTerm.toLowerCase())
                    ).length})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFeedGeneratorForm({
                      ...feedGeneratorForm,
                      selectedOffers: []
                    })}
                  >
                    Clear All
                  </Button>
                </div>
                <div className="border rounded-md p-2 max-h-48 overflow-y-auto">
                  <div className="space-y-2">
                    {offers
                      .filter(offer => 
                        offer.title.toLowerCase().includes(offerSearchTerm.toLowerCase())
                      )
                      .map(offer => (
                      <div key={offer.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`offer-${offer.id}`}
                          checked={feedGeneratorForm.selectedOffers.includes(offer.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFeedGeneratorForm({
                                ...feedGeneratorForm,
                                selectedOffers: [...feedGeneratorForm.selectedOffers, offer.id]
                              });
                            } else {
                              setFeedGeneratorForm({
                                ...feedGeneratorForm,
                                selectedOffers: feedGeneratorForm.selectedOffers.filter(id => id !== offer.id)
                              });
                            }
                          }}
                          className="rounded"
                        />
                        <Label htmlFor={`offer-${offer.id}`} className="text-sm cursor-pointer">
                          {offer.title} ({offer.currency || "$"} {offer.payout})
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Selected: {feedGeneratorForm.selectedOffers.length} offers | Found: {offers.filter(offer => 
                  offer.title.toLowerCase().includes(offerSearchTerm.toLowerCase())
                ).length} offers
              </p>
            </div>

            {/* Survey Providers Dropdown */}
            <div>
              <Label className="text-sm font-medium">Survey Providers</Label>
              <div className="mt-2">
                <Input
                  placeholder="Search survey providers..."
                  value={surveyProviderSearchTerm}
                  onChange={(e) => setSurveyProviderSearchTerm(e.target.value)}
                  className="mb-2"
                />
                <div className="flex items-center justify-between mb-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const filteredSurveyProviders = surveyProviders.filter(sp => 
                        (sp.name || sp.title || "").toLowerCase().includes(surveyProviderSearchTerm.toLowerCase())
                      );
                      setFeedGeneratorForm({
                        ...feedGeneratorForm,
                        selectedSurveyProviders: filteredSurveyProviders.map(sp => sp.id)
                      });
                    }}
                  >
                    Select All ({surveyProviders.filter(sp => 
                      (sp.name || sp.title || "").toLowerCase().includes(surveyProviderSearchTerm.toLowerCase())
                    ).length})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFeedGeneratorForm({
                      ...feedGeneratorForm,
                      selectedSurveyProviders: []
                    })}
                  >
                    Clear All
                  </Button>
                </div>
                <div className="border rounded-md p-2 max-h-48 overflow-y-auto">
                  <div className="space-y-2">
                    {surveyProviders
                      .filter(sp => 
                        (sp.name || sp.title || "").toLowerCase().includes(surveyProviderSearchTerm.toLowerCase())
                      )
                      .map(sp => (
                      <div key={sp.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`sp-${sp.id}`}
                          checked={feedGeneratorForm.selectedSurveyProviders.includes(sp.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFeedGeneratorForm({
                                ...feedGeneratorForm,
                                selectedSurveyProviders: [...feedGeneratorForm.selectedSurveyProviders, sp.id]
                              });
                            } else {
                              setFeedGeneratorForm({
                                ...feedGeneratorForm,
                                selectedSurveyProviders: feedGeneratorForm.selectedSurveyProviders.filter(id => id !== sp.id)
                              });
                            }
                          }}
                          className="rounded"
                        />
                        <Label htmlFor={`sp-${sp.id}`} className="text-sm cursor-pointer">
                          {sp.name || sp.title || sp.id.slice(0, 8)}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Selected: {feedGeneratorForm.selectedSurveyProviders.length} providers | Found: {surveyProviders.filter(sp => 
                  (sp.name || sp.title || "").toLowerCase().includes(surveyProviderSearchTerm.toLowerCase())
                ).length} providers
              </p>
            </div>

            {/* Country Dropdown */}
            <div>
              <Label className="text-sm font-medium">Country</Label>
              <Select
                value={feedGeneratorForm.selectedCountry}
                onValueChange={(value) => setFeedGeneratorForm({ ...feedGeneratorForm, selectedCountry: value })}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select a country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="US">United States</SelectItem>
                  <SelectItem value="GB">United Kingdom</SelectItem>
                  <SelectItem value="CA">Canada</SelectItem>
                  <SelectItem value="AU">Australia</SelectItem>
                  <SelectItem value="DE">Germany</SelectItem>
                  <SelectItem value="FR">France</SelectItem>
                  <SelectItem value="IN">India</SelectItem>
                  <SelectItem value="BR">Brazil</SelectItem>
                  <SelectItem value="JP">Japan</SelectItem>
                  <SelectItem value="MX">Mexico</SelectItem>
                  <SelectItem value="ES">Spain</SelectItem>
                  <SelectItem value="IT">Italy</SelectItem>
                  <SelectItem value="NL">Netherlands</SelectItem>
                  <SelectItem value="PH">Philippines</SelectItem>
                  <SelectItem value="ID">Indonesia</SelectItem>
                  <SelectItem value="PK">Pakistan</SelectItem>
                  <SelectItem value="NG">Nigeria</SelectItem>
                  <SelectItem value="ZA">South Africa</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">Country to display on the activity feed</p>
            </div>

            {/* Points Input */}
            <div>
              <Label className="text-sm font-medium">Points</Label>
              <Input
                type="number"
                value={feedGeneratorForm.points}
                onChange={(e) => setFeedGeneratorForm({ ...feedGeneratorForm, points: e.target.value })}
                placeholder="50"
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">Points to award for each completion</p>
            </div>

            {/* Count */}
            <div>
              <Label className="text-sm font-medium">Count</Label>
              <Input
                type="number"
                min={1}
                max={50}
                value={feedGeneratorForm.count}
                onChange={(e) => setFeedGeneratorForm({ ...feedGeneratorForm, count: Number(e.target.value) })}
                placeholder="5"
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">How many activities to generate</p>
            </div>

            {/* Interval */}
            <div>
              <Label className="text-sm font-medium">Interval (Seconds)</Label>
              <Input
                type="number"
                min={1}
                max={300}
                value={feedGeneratorForm.interval}
                onChange={(e) => setFeedGeneratorForm({ ...feedGeneratorForm, interval: Number(e.target.value) })}
                placeholder="10"
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">Delay between activities</p>
            </div>

            {/* Admin Logs */}
            {generationLogs.length > 0 && (
              <div>
                <Label className="text-sm font-medium">Admin Logs</Label>
                <div className="mt-2 border rounded-md p-3 max-h-32 overflow-y-auto">
                  <div className="space-y-2 text-xs">
                    {generationLogs.map(log => (
                      <div key={log.id} className="border-b pb-2">
                        <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                          <span>Start: {new Date(log.startTime).toLocaleString()}</span>
                          <span>End: {new Date(log.endTime).toLocaleString()}</span>
                          <span>Total: {log.totalActivities} activities</span>
                          <span>Users: {log.users || 'Random'}</span>
                          <span>Offers: {log.offers || 'Random'}</span>
                          <span>Points: {log.points}</span>
                          <span>Interval: {log.interval}s</span>
                          <span>Duration: {(log.totalActivities - 1) * log.interval}s</span>
                          <span>Avg: {((new Date(log.endTime).getTime() - new Date(log.startTime).getTime()) / 1000).toFixed(1)}s</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Run Button */}
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setOpenFeedGenerator(false)}>
                Cancel
              </Button>
              <Button 
                onClick={generateFeedActivity}
                disabled={isGenerating || (feedGeneratorForm.selectedUsers.length === 0 && feedGeneratorForm.selectedOffers.length === 0 && feedGeneratorForm.selectedSurveyProviders.length === 0)}
                className="min-w-[120px]"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-r-2 border-white mr-2"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Run
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
export default AdminNotifications;
