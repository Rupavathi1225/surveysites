import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Mail, Send } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const Inbox = () => {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<"received" | "sent">("received");
  const [receivedMessages, setReceivedMessages] = useState<any[]>([]);
  const [sentMessages, setSentMessages] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [messageContent, setMessageContent] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [isMessageDetailsDialogOpen, setIsMessageDetailsDialogOpen] = useState(false);

  useEffect(() => {
    if (!profile) return;
    
    console.log("Loading messages for user:", profile.id);
    
    // Load received messages (from admin to user)
    supabase.from("inbox_messages")
      .select("*")
      .eq("user_id", profile.id)
      .eq("from_name", "Admin")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error("Error loading received messages:", error);
        } else {
          console.log("Received messages loaded:", data?.length || 0);
          setReceivedMessages(data || []);
        }
      });

    // Load sent messages (from user to admin)
    supabase.from("inbox_messages")
      .select("*")
      .eq("user_id", profile.id)
      .eq("from_name", "User")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error("Error loading sent messages:", error);
        } else {
          console.log("Sent messages loaded:", data?.length || 0);
          setSentMessages(data || []);
        }
      });
  }, [profile]);

  const getCurrentMessages = () => {
    return activeTab === "received" ? receivedMessages : sentMessages;
  };

  const markRead = async (id: string) => {
    await supabase.from("inbox_messages").update({ is_read: true }).eq("id", id);
    setReceivedMessages((m) => m.map((msg) => msg.id === id ? { ...msg, is_read: true } : msg));
  };

  const toggleReadStatus = async (id: string) => {
    const message = getCurrentMessages().find(m => m.id === id);
    if (!message) return;
    
    const newStatus = !message.is_read;
    await supabase.from("inbox_messages").update({ is_read: newStatus }).eq("id", id);
    setReceivedMessages((m) => m.map((msg) => msg.id === id ? { ...msg, is_read: newStatus } : msg));
  };

  const openMessageDetails = (message: any) => {
    setSelectedMessage(message);
    setIsMessageDetailsDialogOpen(true);
    if (!message.is_read) {
      markRead(message.id);
    }
  };

  const sendMessage = async () => {
    try {
      console.log("sendMessage called");
      
      if (!subject.trim() || !messageContent.trim()) {
        console.log("Validation failed: missing subject or message");
        toast({ title: "Error", description: "Please fill in both subject and message.", variant: "destructive" });
        return;
      }

      if (!profile?.id) {
        console.log("Validation failed: user not authenticated", profile);
        toast({ title: "Error", description: "User not authenticated. Please login again.", variant: "destructive" });
        return;
      }

      console.log("Validation passed, starting to send message");
      setIsSending(true);
      
      // Prepare message data for inbox_messages table
      const messageData = {
        user_id: profile.id,
        from_name: "User",
        subject: subject.trim(),
        message: messageContent.trim(),
        is_read: false,
        created_at: new Date().toISOString()
      };

      console.log("Sending message to Admin:", messageData);

      // Try using database function first (bypasses RLS)
      let { data, error } = await supabase.rpc('send_message_to_admin', {
        p_user_id: profile.id,
        p_subject: subject.trim(),
        p_message: messageContent.trim()
      });

      if (error) {
        console.log("RPC function failed, trying direct insert:", error);
        
        // Fallback to direct insert
        const result = await supabase.from("inbox_messages").insert(messageData).select();
        data = result.data;
        error = result.error;
      }

      console.log("Message sending result:", { data, error });

      if (error) {
        console.error("Supabase error details:", error);
        
        // Show user-friendly error message for RLS policy violation
        if (error.code === '42501') {
          toast({ 
            title: "Permission Denied", 
            description: "You don't have permission to send messages. Please contact support.", 
            variant: "destructive" 
          });
        } else {
          toast({ 
            title: "Error", 
            description: error.message || "Failed to send message. Please try again.", 
            variant: "destructive" 
          });
        }
        return;
      }

      console.log("Message sent successfully to Admin Inbox:", data);

      toast({ title: "Success", description: "Message sent to admin successfully!" });
      setSubject("");
      setMessageContent("");
      setIsDialogOpen(false);
      
      // Refresh sent messages
      setTimeout(() => {
        supabase.from("inbox_messages")
          .select("*")
          .eq("user_id", profile.id)
          .eq("from_name", "User")
          .order("created_at", { ascending: false })
          .then(({ data }) => {
            setSentMessages(data || []);
          });
      }, 1000);
      
    } catch (error) {
      console.error("Send message error:", error);
      toast({ 
        title: "Error", 
        description: error?.message || "Failed to send message. Please try again.", 
        variant: "destructive" 
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Inbox</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Send Message
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Send Message to Admin</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  placeholder="Enter message subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  maxLength={255}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  placeholder="Type your message here..."
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  rows={5}
                  maxLength={2000}
                />
                <p className="text-sm text-muted-foreground">
                  {messageContent.length}/2000 characters
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={sendMessage} disabled={isSending}>
                  {isSending ? (
                    <>Sending...</>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Message
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <Button
          variant={activeTab === "received" ? "default" : "outline"}
          onClick={() => setActiveTab("received")}
          className="flex items-center gap-2"
        >
          <Mail className="h-4 w-4" />
          Received ({receivedMessages.length})
        </Button>
        <Button
          variant={activeTab === "sent" ? "default" : "outline"}
          onClick={() => setActiveTab("sent")}
          className="flex items-center gap-2"
        >
          <Send className="h-4 w-4" />
          Sent ({sentMessages.length})
        </Button>
      </div>

      {/* Messages Table */}
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{activeTab === "received" ? "From" : "To"}</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {getCurrentMessages().length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No {activeTab === "received" ? "received" : "sent"} messages
                </TableCell>
              </TableRow>
            ) : (
              getCurrentMessages().map((m) => {
                // Parse subject and message for sent messages
                let displaySubject = m.subject;
                let displayMessage = m.message;
                
                if (activeTab === "sent" && m.message?.includes("SUBJECT:")) {
                  const parts = m.message.split("SUBJECT:");
                  if (parts.length > 1) {
                    const subjectAndMessage = parts[1].split("\n\nMESSAGE:");
                    displaySubject = subjectAndMessage[0]?.trim() || "No Subject";
                    displayMessage = subjectAndMessage[1]?.trim() || m.message;
                  }
                } else if (activeTab === "received" && m.from_name === "Admin" && m.message?.includes("SUBJECT:")) {
                  const parts = m.message.split("SUBJECT:");
                  if (parts.length > 1) {
                    const subjectAndMessage = parts[1].split("\n\nMESSAGE:");
                    displaySubject = subjectAndMessage[0]?.trim() || "No Subject";
                    displayMessage = subjectAndMessage[1]?.trim() || m.message;
                  }
                }
                
                return (
                  <TableRow key={m.id} className="cursor-pointer" onClick={() => openMessageDetails(m)}>
                    <TableCell className="text-sm">
                      {activeTab === "received" ? (m.from_name || "System") : "Admin"}
                    </TableCell>
                    <TableCell className="text-sm font-medium">{displaySubject}</TableCell>
                    <TableCell className="text-sm">{new Date(m.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant={m.is_read ? "secondary" : "default"}>
                        {m.is_read ? "Read" : "Unread"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {activeTab === "received" ? (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleReadStatus(m.id);
                          }}
                        >
                          {m.is_read ? "Mark Unread" : "Mark Read"}
                        </Button>
                      ) : (
                        <span className="text-sm text-muted-foreground">Sent</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent></Card>

      {/* Message Details Dialog */}
      <Dialog open={isMessageDetailsDialogOpen} onOpenChange={setIsMessageDetailsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Message Details</DialogTitle>
          </DialogHeader>
          {selectedMessage && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="text-sm font-medium">From:</Label>
                  <span className="text-sm">{selectedMessage.from_name || "System"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <Label className="text-sm font-medium">Date:</Label>
                  <span className="text-sm">{new Date(selectedMessage.created_at).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <Label className="text-sm font-medium">Status:</Label>
                  <Badge variant={selectedMessage.is_read ? "secondary" : "default"}>
                    {selectedMessage.is_read ? "Read" : "Unread"}
                  </Badge>
                </div>
              </div>
              
              <div className="border-t pt-4 space-y-3">
                <div>
                  <Label className="text-sm font-medium">Subject:</Label>
                  <div className="mt-1 p-3 bg-muted rounded-lg">
                    {(() => {
                      let displaySubject = selectedMessage.subject;
                      if (selectedMessage.from_name === "Admin" && selectedMessage.message?.includes("SUBJECT:")) {
                        const parts = selectedMessage.message.split("SUBJECT:");
                        if (parts.length > 1) {
                          const subjectAndMessage = parts[1].split("\n\nMESSAGE:");
                          displaySubject = subjectAndMessage[0]?.trim() || "No Subject";
                        }
                      }
                      return displaySubject;
                    })()}
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Message:</Label>
                  <div className="mt-1 p-3 bg-muted rounded-lg min-h-[100px] whitespace-pre-wrap">
                    {(() => {
                      let displayMessage = selectedMessage.message;
                      if (selectedMessage.from_name === "Admin" && selectedMessage.message?.includes("SUBJECT:")) {
                        const parts = selectedMessage.message.split("SUBJECT:");
                        if (parts.length > 1) {
                          const subjectAndMessage = parts[1].split("\n\nMESSAGE:");
                          displayMessage = subjectAndMessage[1]?.trim() || selectedMessage.message;
                        }
                      }
                      return displayMessage;
                    })()}
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button 
                  variant="outline" 
                  onClick={() => toggleReadStatus(selectedMessage.id)}
                >
                  {selectedMessage.is_read ? "Mark as Unread" : "Mark as Read"}
                </Button>
                <Button onClick={() => setIsMessageDetailsDialogOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
export default Inbox;
