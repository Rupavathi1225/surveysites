import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Send, Users, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface User {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
}

const AdminMessageCreate = () => {
  const navigate = useNavigate();
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectAll, setSelectAll] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, username, first_name, last_name, email")
      .order("username");

    setAllUsers(data || []);
  };

  const filteredUsers = allUsers.filter(user => {
    const searchLower = searchQuery.toLowerCase();
    return (
      user.username?.toLowerCase().includes(searchLower) ||
      user.first_name?.toLowerCase().includes(searchLower) ||
      user.last_name?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower)
    );
  });

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedUsers(filteredUsers.map(user => user.id));
    } else {
      setSelectedUsers([]);
    }
  };

  const handleUserToggle = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedUsers([...selectedUsers, userId]);
    } else {
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
    }
    setSelectAll(false);
  };

  const sendMessage = async () => {
    if (!subject.trim() || !message.trim()) {
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
        subject: subject.trim(),
        message: message.trim(),
        is_read: false,
        created_at: new Date().toISOString()
      }));

      const { data, error } = await supabase.from("inbox_messages").insert(messages).select();

      if (error) {
        console.error("Supabase error:", error);
        throw error;
      }

      console.log("Messages sent successfully:", data);
      
      // Show success notification
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
      setSubject("");
      setMessage("");
      setSelectedUsers([]);
      setSelectAll(false);
      setSearchQuery("");

    } catch (error) {
      console.error("Send message error:", error);
      toast({ 
        title: "Error", 
        description: error?.message || "Failed to send messages. Please try again.", 
        variant: "destructive" 
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button 
          variant="outline" 
          onClick={() => navigate("/admin/inbox")}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Inbox
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Compose Message</h1>
          <p className="text-muted-foreground">Send a message to users</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Message Composition */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Message Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
                maxLength={2000}
              />
              <p className="text-sm text-muted-foreground">
                {message.length}/2000 characters
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => navigate("/admin/inbox")}
              >
                Cancel
              </Button>
              <Button 
                onClick={sendMessage} 
                disabled={isSending || selectedUsers.length === 0}
              >
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
          </CardContent>
        </Card>

        {/* User Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Select Recipients
            </CardTitle>
            <div className="space-y-2">
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="select-all"
                  checked={selectAll}
                  onCheckedChange={handleSelectAll}
                />
                <Label htmlFor="select-all" className="text-sm">
                  Select all ({filteredUsers.length} users)
                </Label>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-y-auto space-y-2">
              {filteredUsers.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No users found</p>
                </div>
              ) : (
                filteredUsers.map((user) => (
                  <div key={user.id} className="flex items-center space-x-3 p-2 rounded hover:bg-gray-50">
                    <Checkbox
                      id={`user-${user.id}`}
                      checked={selectedUsers.includes(user.id)}
                      onCheckedChange={(checked) => handleUserToggle(user.id, checked as boolean)}
                    />
                    <div className="flex-1 min-w-0">
                      <Label 
                        htmlFor={`user-${user.id}`} 
                        className="text-sm font-medium cursor-pointer truncate"
                      >
                        {user.username || `${user.first_name} ${user.last_name}` || "Unknown User"}
                      </Label>
                      <p className="text-xs text-muted-foreground truncate">
                        {user.email}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
            {selectedUsers.length > 0 && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  {selectedUsers.length} user{selectedUsers.length !== 1 ? 's' : ''} selected
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminMessageCreate;
