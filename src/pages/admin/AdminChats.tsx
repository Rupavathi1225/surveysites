import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { MessageSquare, Send, Users, Mail, MessageCircle, UserCheck, CheckSquare, Square } from "lucide-react";

const AdminChats = () => {
  const [tab, setTab] = useState<"chats" | "comments" | "compose">("chats");
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [replyText, setReplyText] = useState("");
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [composeMessage, setComposeMessage] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [isComposeDialogOpen, setIsComposeDialogOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");

  useEffect(() => {
    loadConversations();
    loadAllUsers();
  }, []);

  const loadAllUsers = async () => {
    const { data } = await supabase.from("profiles").select("id, username, first_name, last_name, email").order("username");
    setAllUsers(data || []);
  };

  const loadConversations = async () => {
    // Get all chat messages grouped by user
    const { data } = await supabase.from("chat_messages").select("*").order("created_at", { ascending: false });
    if (!data) return;

    // Group by user_id to get conversations
    const userMap = new Map<string, any>();
    for (const msg of data as any[]) {
      // Include user messages (not admin messages) to show users who have chatted
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
    // Get all chat messages for this user
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

  const sendNewMessage = async () => {
    if (!composeSubject.trim() || !composeMessage.trim()) {
      toast({ title: "Error", description: "Please fill in both subject and message.", variant: "destructive" });
      return;
    }

    if (selectedUsers.length === 0) {
      toast({ title: "Error", description: "Please select at least one user.", variant: "destructive" });
      return;
    }

    setIsSending(true);
    try {
      const messageContent = `SUBJECT: ${composeSubject.trim()}\n\nMESSAGE: ${composeMessage.trim()}`;
      
      // Send message to all selected users
      for (const userId of selectedUsers) {
        await supabase.from("inbox_messages").insert({
          user_id: userId,
          from_name: "Admin",
          subject: composeSubject.trim(),
          message: messageContent,
          is_read: false,
          created_at: new Date().toISOString()
        });
      }

      toast({ 
        title: "Success!", 
        description: `Message sent to ${selectedUsers.length} user${selectedUsers.length > 1 ? 's' : ''}.` 
      });
      
      // Reset form
      setComposeSubject("");
      setComposeMessage("");
      setSelectedUsers([]);
      setIsComposeDialogOpen(false);
    } catch (error) {
      toast({ title: "Error", description: "Failed to send message. Please try again.", variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const selectAllUsers = () => {
    setSelectedUsers(filteredUsers.map(user => user.id));
  };

  const deselectAllUsers = () => {
    setSelectedUsers([]);
  };

  // Filter users based on search query
  const filteredUsers = allUsers.filter(user => {
    const searchLower = userSearchQuery.toLowerCase();
    const username = user.username?.toLowerCase() || "";
    const firstName = user.first_name?.toLowerCase() || "";
    const lastName = user.last_name?.toLowerCase() || "";
    const email = user.email?.toLowerCase() || "";
    
    return username.includes(searchLower) || 
           firstName.includes(searchLower) || 
           lastName.includes(searchLower) || 
           email.includes(searchLower);
  });

  const userName = (conv: any) => {
    if (conv.profile?.username) return conv.profile.username;
    if (conv.profile?.first_name) return `${conv.profile.first_name} ${conv.profile.last_name || ""}`.trim();
    return conv.userId.slice(0, 8);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Admin Messaging Center</h1>
          <p className="text-sm text-muted-foreground">View conversations and send messages to users</p>
        </div>
        <Dialog open={isComposeDialogOpen} onOpenChange={setIsComposeDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Compose Message
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Send Message to Users</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* User Selection */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Select Users</Label>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={selectAllUsers}>
                      <CheckSquare className="h-4 w-4 mr-1" /> Select All
                    </Button>
                    <Button variant="outline" size="sm" onClick={deselectAllUsers}>
                      <Square className="h-4 w-4 mr-1" /> Clear
                    </Button>
                  </div>
                </div>
                
                {/* Search Field */}
                <div className="relative">
                  <Input
                    placeholder="Search users by name, username, or email..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="pr-8"
                  />
                  {userSearchQuery && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1 h-6 w-6 p-0"
                      onClick={() => setUserSearchQuery("")}
                    >
                      ×
                    </Button>
                  )}
                </div>
                
                <div className="border rounded-lg p-3 max-h-40 overflow-y-auto">
                  <div className="grid grid-cols-1 gap-2">
                    {filteredUsers.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        {userSearchQuery ? "No users found matching your search." : "No users available."}
                      </p>
                    ) : (
                      filteredUsers.map((user) => (
                        <div key={user.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={user.id}
                            checked={selectedUsers.includes(user.id)}
                            onCheckedChange={() => toggleUserSelection(user.id)}
                          />
                          <Label htmlFor={user.id} className="flex-1 cursor-pointer">
                            <div className="flex justify-between items-center">
                              <span>
                                {user.username || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unknown'}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {selectedUsers.includes(user.id) ? 'Selected' : ''}
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground">{user.email}</div>
                          </Label>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  {selectedUsers.length} user{selectedUsers.length !== 1 ? 's' : ''} selected
                  {userSearchQuery && ` • ${filteredUsers.length} user${filteredUsers.length !== 1 ? 's' : ''} found`}
                </p>
              </div>

              {/* Message Composition */}
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  placeholder="Enter message subject"
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  maxLength={255}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  placeholder="Type your message here..."
                  value={composeMessage}
                  onChange={(e) => setComposeMessage(e.target.value)}
                  rows={5}
                  maxLength={2000}
                />
                <p className="text-sm text-muted-foreground">
                  {composeMessage.length}/2000 characters
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsComposeDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={sendNewMessage} disabled={isSending || selectedUsers.length === 0}>
                  {isSending ? (
                    <>Sending...</>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send to {selectedUsers.length} User{selectedUsers.length !== 1 ? 's' : ''}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-2">
        <Button variant={tab === "chats" ? "default" : "outline"} size="sm" onClick={() => setTab("chats")}>
          <MessageSquare className="h-4 w-4 mr-1" /> User Chats
        </Button>
        <Button variant={tab === "comments" ? "default" : "outline"} size="sm" onClick={() => setTab("comments")}>
          <Users className="h-4 w-4 mr-1" /> Comments
        </Button>
        <Button variant={tab === "compose" ? "default" : "outline"} size="sm" onClick={() => setTab("compose")}>
          <Mail className="h-4 w-4 mr-1" /> Compose
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
