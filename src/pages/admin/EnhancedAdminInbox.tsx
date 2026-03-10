import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { 
    MessageSquare, 
    Send, 
    Users, 
    Mail, 
    Eye, 
    Reply, 
    Trash,
    CheckSquare,
    Square,
    Search,
    Inbox,
    ArrowLeft,
    User,
    Clock
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Message {
  id: string;
  user_id: string;
  from_name: string;
  subject: string;
  message: string;
  is_read: boolean;
  created_at: string;
  userInfo?: {
    id: string;
    username: string;
    first_name: string;
    last_name: string;
    email: string;
  };
}

interface User {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface ConversationStats {
  totalUsers: number;
  totalMessages: number;
  unreadMessages: number;
  sentMessages: number;
  receivedMessages: number;
}

const EnhancedAdminInbox = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"received" | "sent" | "conversations">("received");
  const [receivedMessages, setReceivedMessages] = useState<Message[]>([]);
  const [sentMessages, setSentMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [conversationMessages, setConversationMessages] = useState<Message[]>([]);
  const [stats, setStats] = useState<ConversationStats>({
    totalUsers: 0,
    totalMessages: 0,
    unreadMessages: 0,
    sentMessages: 0,
    receivedMessages: 0
  });
  
  // Dialog states
  const [isReplyDialogOpen, setIsReplyDialogOpen] = useState(false);
  const [isComposeDialogOpen, setIsComposeDialogOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [replyText, setReplyText] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeMessage, setComposeMessage] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [userSearchQuery, setUserSearchQuery] = useState("");
  
  // Loading states
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadReceivedMessages(),
        loadSentMessages(),
        loadConversations(),
        loadUsers(),
        loadStats()
      ]);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadReceivedMessages = async () => {
    const { data, error } = await supabase
      .from("inbox_messages")
      .select(`
        *,
        profiles!inbox_messages_user_id_fkey (
          id, username, first_name, last_name, email
        )
      `)
      .eq("from_name", "User")
      .order("created_at", { ascending: false });

    if (error) throw error;
    
    const messagesWithUserInfo = data?.map(msg => ({
      ...msg,
      userInfo: msg.profiles
    })) || [];
    
    setReceivedMessages(messagesWithUserInfo);
  };

  const loadSentMessages = async () => {
    const { data, error } = await supabase
      .from("inbox_messages")
      .select(`
        *,
        profiles!inbox_messages_user_id_fkey (
          id, username, first_name, last_name, email
        )
      `)
      .eq("from_name", "Admin")
      .order("created_at", { ascending: false });

    if (error) throw error;
    
    const messagesWithUserInfo = data?.map(msg => ({
      ...msg,
      userInfo: msg.profiles
    })) || [];
    
    setSentMessages(messagesWithUserInfo);
  };

  const loadConversations = async () => {
    const { data, error } = await supabase
      .from("inbox_messages")
      .select(`
        *,
        profiles!inbox_messages_user_id_fkey (
          id, username, first_name, last_name, email
        )
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Group messages by user
    const groupedConversations = data?.reduce((acc: any, msg: any) => {
      const userId = msg.user_id;
      if (!acc[userId]) {
        acc[userId] = {
          user_id: userId,
          userInfo: msg.profiles,
          messages: [],
          lastMessage: msg,
          unreadCount: 0,
          totalMessages: 0,
          adminSentCount: 0,
          userSentCount: 0
        };
      }
      acc[userId].messages.push(msg);
      acc[userId].totalMessages++;
      
      // Count messages by direction
      if (msg.from_name === "User") {
        acc[userId].userSentCount++;
        if (!msg.is_read) {
          acc[userId].unreadCount++;
        }
      } else if (msg.from_name === "Admin") {
        acc[userId].adminSentCount++;
      }
      
      return acc;
    }, {});

    const conversationsArray = Object.values(groupedConversations || {});
    setConversations(conversationsArray);
  };

  const loadUsers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, username, first_name, last_name, email")
      .order("username");

    setAllUsers(data || []);
  };

  const loadStats = async () => {
    const { data: received } = await supabase
      .from("inbox_messages")
      .select("id")
      .eq("from_name", "User");
    
    const { data: sent } = await supabase
      .from("inbox_messages")
      .select("id")
      .eq("from_name", "Admin");
    
    const { data: unread } = await supabase
      .from("inbox_messages")
      .select("id")
      .eq("from_name", "User")
      .eq("is_read", false);

    const { data: users } = await supabase
      .from("profiles")
      .select("id");

    setStats({
      totalUsers: users?.length || 0,
      totalMessages: (received?.length || 0) + (sent?.length || 0),
      unreadMessages: unread?.length || 0,
      receivedMessages: received?.length || 0,
      sentMessages: sent?.length || 0
    });
  };

  const openConversation = async (conversation: any) => {
    setSelectedConversation(conversation);
    const { data } = await supabase
      .from("inbox_messages")
      .select(`
        *,
        profiles!inbox_messages_user_id_fkey (
          id, username, first_name, last_name, email
        )
      `)
      .eq("user_id", conversation.user_id)
      .order("created_at", { ascending: true });

    const messagesWithUserInfo = data?.map(msg => ({
      ...msg,
      userInfo: msg.profiles
    })) || [];
    
    setConversationMessages(messagesWithUserInfo);
    
    // Mark all messages from user as read
    await supabase
      .from("inbox_messages")
      .update({ is_read: true })
      .eq("user_id", conversation.user_id)
      .eq("from_name", "User")
      .eq("is_read", false);
      
    loadStats();
    loadConversations();
  };

  const sendReply = async () => {
    if (!replyText.trim() || !selectedConversation) {
      toast({ title: "Error", description: "Please enter a reply message.", variant: "destructive" });
      return;
    }

    setIsSending(true);
    try {
      const { data, error } = await supabase.from("inbox_messages").insert({
        user_id: selectedConversation.user_id,
        from_name: "Admin",
        subject: `Re: ${selectedConversation.lastMessage.subject}`,
        message: replyText.trim(),
        is_read: false,
        created_at: new Date().toISOString()
      }).select();

      if (error) throw error;
      
      toast({ title: "Success", description: "Reply sent successfully!" });

      // Try to call any success popup function if it exists
      try {
        if (typeof (window as any).showadminsucesspopup === 'function') {
          (window as any).showadminsucesspopup();
        }
      } catch (popupError) {
        console.log("Success popup function not available, continuing...");
      }

      setReplyText("");
      setIsReplyDialogOpen(false);
      
      // Refresh conversation
      await openConversation(selectedConversation);
      loadSentMessages();
      loadStats();
    } catch (error) {
      console.error("Send reply error:", error);
      toast({ title: "Error", description: "Failed to send reply.", variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  const sendMultipleMessages = async () => {
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
      const messages = selectedUsers.map(userId => ({
        user_id: userId,
        from_name: "Admin",
        subject: composeSubject.trim(),
        message: composeMessage.trim(),
        is_read: false,
        created_at: new Date().toISOString()
      }));

      const { data, error } = await supabase.from("inbox_messages").insert(messages).select();

      if (error) throw error;
      
      toast({ 
        title: "Success", 
        description: `Message sent to ${selectedUsers.length} user(s) successfully!` 
      });

      // Try to call any success popup function if it exists
      try {
        if (typeof (window as any).showadminsucesspopup === 'function') {
          (window as any).showadminsucesspopup();
        }
      } catch (popupError) {
        console.log("Success popup function not available, continuing...");
      }

      // Reset form
      setComposeSubject("");
      setComposeMessage("");
      setSelectedUsers([]);
      setIsComposeDialogOpen(false);
      
      // Refresh data
      loadSentMessages();
      loadStats();
    } catch (error) {
      console.error("Send messages error:", error);
      toast({ title: "Error", description: "Failed to send messages.", variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  const markAsRead = async (messageId: string) => {
    await supabase.from("inbox_messages").update({ is_read: true }).eq("id", messageId);
    loadReceivedMessages();
    loadStats();
  };

  const deleteMessage = async (messageId: string) => {
    await supabase.from("inbox_messages").delete().eq("id", messageId);
    loadAllData();
  };

  const filteredUsers = allUsers.filter(user => {
    const searchLower = userSearchQuery.toLowerCase();
    return (
      user.username?.toLowerCase().includes(searchLower) ||
      user.first_name?.toLowerCase().includes(searchLower) ||
      user.last_name?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower)
    );
  });

  const getCurrentMessages = () => {
    switch (activeTab) {
      case "received": return receivedMessages;
      case "sent": return sentMessages;
      default: return [];
    }
  };

  if (selectedConversation) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            onClick={() => setSelectedConversation(null)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Inbox
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {selectedConversation.userInfo?.username || 
               `${selectedConversation.userInfo?.first_name} ${selectedConversation.userInfo?.last_name}` || 
               "Unknown User"}
            </h1>
            <p className="text-muted-foreground">
              {selectedConversation.totalMessages} total messages • 
              {selectedConversation.userSentCount} from user • 
              {selectedConversation.adminSentCount} from admin • 
              {selectedConversation.unreadCount} unread
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Conversation</CardTitle>
              <Button 
                onClick={() => setIsReplyDialogOpen(true)}
                className="flex items-center gap-2"
              >
                <Reply className="h-4 w-4" />
                Reply
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {conversationMessages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`p-4 rounded-lg ${
                    msg.from_name === "Admin" 
                      ? "bg-blue-50 ml-auto max-w-[70%]" 
                      : "bg-gray-50 mr-auto max-w-[70%]"
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-medium text-sm">
                      {msg.from_name === "Admin" ? "You" : 
                       msg.userInfo?.username || 
                       `${msg.userInfo?.first_name} ${msg.userInfo?.last_name}`}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(msg.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-sm mb-2">
                    <div className="font-medium mb-1">{msg.subject}</div>
                    <div>{msg.message}</div>
                  </div>
                  {!msg.is_read && msg.from_name === "User" && (
                    <Badge variant="secondary" className="text-xs">Unread</Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Reply Dialog */}
        <Dialog open={isReplyDialogOpen} onOpenChange={setIsReplyDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reply to {selectedConversation.userInfo?.username || "User"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reply">Message</Label>
                <Textarea
                  id="reply"
                  placeholder="Type your reply..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={4}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsReplyDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={sendReply} disabled={isSending}>
                  {isSending ? "Sending..." : "Send Reply"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Admin Inbox</h1>
          <p className="text-muted-foreground">Manage messages and conversations</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => navigate("/admin/messages/create")}
            className="flex items-center gap-2"
          >
            <Send className="h-4 w-4" />
            Compose Message
          </Button>
          <Button 
            onClick={() => setIsComposeDialogOpen(true)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Users className="h-4 w-4" />
            Multi-User Message
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{stats.totalUsers}</p>
                <p className="text-sm text-muted-foreground">Total Users</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{stats.totalMessages}</p>
                <p className="text-sm text-muted-foreground">Total Messages</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Inbox className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-2xl font-bold">{stats.receivedMessages}</p>
                <p className="text-sm text-muted-foreground">Received</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Send className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">{stats.sentMessages}</p>
                <p className="text-sm text-muted-foreground">Sent</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-2xl font-bold">{stats.unreadMessages}</p>
                <p className="text-sm text-muted-foreground">Unread</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="received" className="flex items-center gap-2">
            <Inbox className="h-4 w-4" />
            Received ({receivedMessages.length})
          </TabsTrigger>
          <TabsTrigger value="sent" className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            Sent ({sentMessages.length})
          </TabsTrigger>
          <TabsTrigger value="conversations" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Conversations ({conversations.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="received" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Messages from Users</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">Loading messages...</div>
              ) : receivedMessages.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Mail className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No messages received from users</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {receivedMessages.map((message) => (
                    <div key={message.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <span className="font-medium">
                            {message.userInfo?.username || 
                             `${message.userInfo?.first_name} ${message.userInfo?.last_name}` || 
                             "Unknown User"}
                          </span>
                          {!message.is_read && (
                            <Badge variant="destructive" className="text-xs">Unread</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {new Date(message.created_at).toLocaleString()}
                        </div>
                      </div>
                      <div className="mb-3">
                        <div className="font-medium mb-1">{message.subject}</div>
                        <div className="text-sm text-gray-600">{message.message}</div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => openConversation({
                            user_id: message.user_id,
                            userInfo: message.userInfo,
                            lastMessage: message
                          })}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View Conversation
                        </Button>
                        {!message.is_read && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => markAsRead(message.id)}
                          >
                            Mark as Read
                          </Button>
                        )}
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => deleteMessage(message.id)}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sent" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sent Messages</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">Loading messages...</div>
              ) : sentMessages.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Send className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No messages sent yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sentMessages.map((message) => (
                    <div key={message.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <Send className="h-4 w-4" />
                          <span className="font-medium">To: {message.userInfo?.username || "Unknown User"}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {new Date(message.created_at).toLocaleString()}
                        </div>
                      </div>
                      <div className="mb-3">
                        <div className="font-medium mb-1">{message.subject}</div>
                        <div className="text-sm text-gray-600">{message.message}</div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => openConversation({
                            user_id: message.user_id,
                            userInfo: message.userInfo,
                            lastMessage: message
                          })}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View Conversation
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => deleteMessage(message.id)}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conversations" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>User Conversations</CardTitle>
                <div className="text-sm text-muted-foreground">
                  {conversations.length} conversations • 
                  {stats.sentMessages} messages sent to users
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">Loading conversations...</div>
              ) : conversations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No conversations yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {conversations.map((conversation) => (
                    <div 
                      key={conversation.user_id} 
                      className="border rounded-lg p-4 cursor-pointer hover:bg-gray-50"
                      onClick={() => openConversation(conversation)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <User className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <div className="font-medium">
                              {conversation.userInfo?.username || 
                               `${conversation.userInfo?.first_name} ${conversation.userInfo?.last_name}` || 
                               "Unknown User"}
                            </div>
                            <div className="text-sm text-gray-600 max-w-md truncate">
                              {conversation.lastMessage.message}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">
                            {new Date(conversation.lastMessage.created_at).toLocaleString()}
                          </div>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {conversation.totalMessages} total
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {conversation.userSentCount} from user
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {conversation.adminSentCount} from admin
                            </Badge>
                            {conversation.unreadCount > 0 && (
                              <Badge variant="destructive" className="text-xs">
                                {conversation.unreadCount} unread
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Multi-User Message Dialog */}
      <Dialog open={isComposeDialogOpen} onOpenChange={setIsComposeDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Send Message to Multiple Users</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="compose-subject">Subject</Label>
                <Input
                  id="compose-subject"
                  placeholder="Enter message subject"
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="compose-message">Message</Label>
                <Textarea
                  id="compose-message"
                  placeholder="Type your message here..."
                  value={composeMessage}
                  onChange={(e) => setComposeMessage(e.target.value)}
                  rows={6}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsComposeDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={sendMultipleMessages} 
                  disabled={isSending || selectedUsers.length === 0}
                >
                  {isSending ? "Sending..." : `Send to ${selectedUsers.length} Users`}
                </Button>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Select Users</Label>
                <Input
                  placeholder="Search users..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                />
              </div>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {filteredUsers.map((user) => (
                  <div key={user.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`user-${user.id}`}
                      checked={selectedUsers.includes(user.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedUsers([...selectedUsers, user.id]);
                        } else {
                          setSelectedUsers(selectedUsers.filter(id => id !== user.id));
                        }
                      }}
                    />
                    <Label htmlFor={`user-${user.id}`} className="text-sm">
                      {user.username || `${user.first_name} ${user.last_name}`}
                    </Label>
                  </div>
                ))}
              </div>
              {selectedUsers.length > 0 && (
                <div className="p-2 bg-blue-50 rounded">
                  <p className="text-sm text-blue-800">
                    {selectedUsers.length} user{selectedUsers.length !== 1 ? 's' : ''} selected
                  </p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EnhancedAdminInbox;
