import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Send } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const UserChat = () => {
  const { profile } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (!profile) return;
    
    // Load chat messages for this user
    loadChatMessages();
    
    // Set up real-time subscription
    const subscription = supabase
      .channel('chat_messages')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'chat_messages',
          filter: `user_id=eq.${profile.id}` 
        },
        (payload) => {
          if (payload.new) {
            setMessages(prev => [...prev, payload.new]);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [profile]);

  const loadChatMessages = async () => {
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("user_id", profile?.id)
      .order("created_at", { ascending: true });
    
    setMessages(data || []);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !profile?.id) {
      return;
    }

    setIsSending(true);
    try {
      const messageData = {
        user_id: profile.id,
        from_name: "User",
        subject: "Chat Message",
        message: newMessage.trim(),
        is_read: false,
        created_at: new Date().toISOString()
      };

      console.log("Sending chat message to Admin Inbox:", messageData);

      // Send to inbox_messages table so it appears in Admin Inbox
      const { data, error } = await supabase
        .from("inbox_messages")
        .insert(messageData)
        .select();

      if (error) {
        console.error("Chat message error:", error);
        throw error;
      }

      console.log("Chat message sent successfully to Admin Inbox:", data);
      
      // Clear input
      setNewMessage("");
      
    } catch (error) {
      console.error("Send chat message error:", error);
      toast({ 
        title: "Error", 
        description: "Failed to send message. Please try again.", 
        variant: "destructive" 
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Live Chat</h1>
          <p className="text-sm text-muted-foreground">Chat with admin in real-time</p>
        </div>
        <Badge variant="outline" className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4" />
          {profile?.username || profile?.first_name || "User"}
        </Badge>
      </div>

      <Card className="h-[600px] flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Chat with Admin</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col p-0">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No messages yet. Start a conversation!</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.is_admin ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[70%] p-3 rounded-lg text-sm ${
                      message.is_admin
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-xs">
                        {message.is_admin ? "Admin" : "You"}
                      </span>
                      <span className="text-xs opacity-70">
                        {new Date(message.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <p className="break-words">{message.message}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Input Area */}
          <div className="border-t p-4">
            <div className="flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                onKeyPress={handleKeyPress}
                disabled={isSending}
                className="flex-1"
              />
              <Button 
                onClick={sendMessage} 
                disabled={isSending || !newMessage.trim()}
                size="icon"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Press Enter to send, Shift+Enter for new line
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserChat;
