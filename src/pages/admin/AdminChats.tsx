import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { MessageSquare, Send, Users } from "lucide-react";

const AdminChats = () => {
  const [tab, setTab] = useState<"chats" | "comments">("chats");
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [replyText, setReplyText] = useState("");

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    // Get all chat messages grouped by user
    const { data } = await supabase.from("chat_messages").select("*").order("created_at", { ascending: false });
    if (!data) return;

    // Group by user_id to get conversations
    const userMap = new Map<string, any>();
    for (const msg of data as any[]) {
      if (!msg.is_admin && !userMap.has(msg.user_id)) {
        userMap.set(msg.user_id, msg);
      }
    }

    // Get user profiles for these user_ids
    const userIds = Array.from(userMap.keys());
    if (userIds.length === 0) { setConversations([]); return; }

    const { data: profiles } = await supabase.from("profiles").select("id, username, first_name, last_name").in("id", userIds);
    const profileMap = new Map((profiles || []).map(p => [p.id, p]));

    const convos = Array.from(userMap.entries()).map(([userId, lastMsg]) => ({
      userId,
      profile: profileMap.get(userId),
      lastMessage: lastMsg.message,
      lastDate: lastMsg.created_at,
    }));

    setConversations(convos);
  };

  const selectUser = async (conv: any) => {
    setSelectedUser(conv);
    const { data } = await supabase.from("chat_messages").select("*")
      .eq("user_id", conv.userId)
      .order("created_at", { ascending: true });
    setMessages(data || []);
  };

  const sendReply = async () => {
    if (!replyText.trim() || !selectedUser) return;
    await supabase.from("chat_messages").insert({
      user_id: selectedUser.userId,
      message: replyText.trim(),
      is_admin: true,
    });
    setReplyText("");
    toast({ title: "Reply sent!" });
    selectUser(selectedUser);
  };

  const userName = (conv: any) => {
    if (conv.profile?.username) return conv.profile.username;
    if (conv.profile?.first_name) return `${conv.profile.first_name} ${conv.profile.last_name || ""}`.trim();
    return conv.userId.slice(0, 8);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">User Chats & Comments</h1>
        <p className="text-sm text-muted-foreground">View and reply to user messages and moderate</p>
      </div>

      <div className="flex gap-2">
        <Button variant={tab === "chats" ? "default" : "outline"} size="sm" onClick={() => setTab("chats")}>
          <MessageSquare className="h-4 w-4 mr-1" /> User Chats
        </Button>
        <Button variant={tab === "comments" ? "default" : "outline"} size="sm" onClick={() => setTab("comments")}>
          <Users className="h-4 w-4 mr-1" /> Comments
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-4 min-h-[500px]">
        {/* Conversations List */}
        <Card className="lg:col-span-1">
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3">Conversations</h3>
            <div className="space-y-1 max-h-[450px] overflow-y-auto">
              {conversations.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No conversations</p>
              ) : conversations.map((conv) => (
                <button key={conv.userId} onClick={() => selectUser(conv)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${selectedUser?.userId === conv.userId ? "bg-primary/10 border border-primary/30" : "hover:bg-accent"}`}>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                      {userName(conv).slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{userName(conv)}</p>
                      <p className="text-xs text-muted-foreground truncate">{conv.lastMessage}</p>
                      <p className="text-xs text-muted-foreground">{new Date(conv.lastDate).toLocaleString()}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Chat View */}
        <Card className="lg:col-span-2">
          <CardContent className="p-4 flex flex-col h-full">
            {!selectedUser ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>Select a conversation</p>
                </div>
              </div>
            ) : (
              <>
                <div className="border-b pb-2 mb-3">
                  <p className="font-semibold">{userName(selectedUser)}</p>
                </div>
                <div className="flex-1 overflow-y-auto space-y-2 max-h-[380px] mb-3">
                  {messages.map((m) => (
                    <div key={m.id} className={`flex ${m.is_admin ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[70%] p-2.5 rounded-lg text-sm ${m.is_admin ? "bg-primary text-primary-foreground" : "bg-accent"}`}>
                        <p>{m.message}</p>
                        <p className={`text-xs mt-1 ${m.is_admin ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                          {new Date(m.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Type a reply..."
                    onKeyDown={e => e.key === "Enter" && sendReply()} />
                  <Button onClick={sendReply}><Send className="h-4 w-4" /></Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
export default AdminChats;
