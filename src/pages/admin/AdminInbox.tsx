import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
    Search
} from "lucide-react";

const AdminInbox = () => {
    const [messages, setMessages] = useState<any[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedMessages, setSelectedMessages] = useState<string[]>([]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isReplyDialogOpen, setIsReplyDialogOpen] = useState(false);
    const [selectedMessage, setSelectedMessage] = useState<any>(null);
    const [replyText, setReplyText] = useState("");
    const [isSending, setIsSending] = useState(false);

    useEffect(() => {
        loadMessages();
        loadUnreadCount();
    }, []);

    const loadMessages = async () => {
        const { data } = await supabase
            .from("inbox_messages")
            .select("*")
            .eq("from_name", "User")
            .order("created_at", { ascending: false });
        
        if (data && data.length > 0) {
            // Get user profiles for all user_ids
            const userIds = [...new Set(data.map(msg => msg.user_id))];
            const { data: profiles } = await supabase
                .from("profiles")
                .select("id, username, first_name, last_name, email")
                .in("id", userIds);
            
            const profileMap = new Map((profiles || []).map(p => [p.id, p]));
            
            // Attach user info to messages
            const messagesWithUsers = data.map(msg => ({
                ...msg,
                userInfo: profileMap.get(msg.user_id)
            }));
            
            setMessages(messagesWithUsers);
        } else {
            setMessages([]);
        }
    };

    const loadUnreadCount = async () => {
        const { data } = await supabase
            .from("inbox_messages")
            .select("*")
            .eq("from_name", "User")
            .eq("is_read", false);
        
        setUnreadCount(data?.length || 0);
    };

    const filteredMessages = messages.filter(message => {
        const searchLower = searchQuery.toLowerCase();
        const subject = message.subject?.toLowerCase() || "";
        const messageContent = message.message?.toLowerCase() || "";
        const userName = message.userInfo?.username?.toLowerCase() || 
                        message.userInfo?.first_name?.toLowerCase() || 
                        message.from_name?.toLowerCase() || "";
        
        return searchLower === "" || 
               subject.includes(searchLower) || 
               messageContent.includes(searchLower) || 
               userName.includes(searchLower);
    });

    const toggleMessageSelection = (messageId: string) => {
        setSelectedMessages(prev => 
            prev.includes(messageId) 
                ? prev.filter(id => id !== messageId)
                : [...prev, messageId]
        );
    };

    const selectAllMessages = () => {
        setSelectedMessages(filteredMessages.map(m => m.id));
    };

    const clearSelection = () => {
        setSelectedMessages([]);
    };

    const markMessagesAsRead = async () => {
        if (selectedMessages.length === 0) {
            toast({ title: "Error", description: "Please select at least one message.", variant: "destructive" });
            return;
        }

        try {
            const { error } = await supabase
                .from("inbox_messages")
                .update({ is_read: true })
                .in("id", selectedMessages);

            if (error) throw error;
            
            toast({ title: "Success", description: `${selectedMessages.length} message(s) marked as read.` });
            setSelectedMessages([]);
            loadUnreadCount();
        } catch (error) {
            toast({ title: "Error", description: "Failed to mark messages as read.", variant: "destructive" });
        }
    };

    const deleteMessages = async () => {
        if (selectedMessages.length === 0) {
            toast({ title: "Error", description: "Please select at least one message.", variant: "destructive" });
            return;
        }

        try {
            const { error } = await supabase
                .from("inbox_messages")
                .delete()
                .in("id", selectedMessages);

            if (error) throw error;
            
            toast({ title: "Success", description: `${selectedMessages.length} message(s) deleted successfully.` });
            setSelectedMessages([]);
        } catch (error) {
            toast({ title: "Error", description: "Failed to delete messages.", variant: "destructive" });
        }
    };

    const openReplyDialog = (message: any) => {
        setSelectedMessage(message);
        setReplyText("");
        setIsReplyDialogOpen(true);
    };

    const sendReply = async () => {
        try {
            console.log("sendReply called", { replyText, selectedMessage });
            
            if (!replyText.trim() || !selectedMessage) {
                console.log("Validation failed: missing reply text or selected message");
                toast({ title: "Error", description: "Please enter a reply message.", variant: "destructive" });
                return;
            }

            if (!selectedMessage.user_id) {
                console.log("Validation failed: missing user_id in selected message", selectedMessage);
                toast({ title: "Error", description: "Invalid message selected. Please try again.", variant: "destructive" });
                return;
            }

            console.log("Validation passed, starting to send reply");
            setIsSending(true);
            
            const replyData = {
                user_id: selectedMessage.user_id,
                from_name: "Admin",
                subject: `Re: ${selectedMessage.subject}`,
                message: replyText.trim(),
                is_read: false,
                created_at: new Date().toISOString()
            };

            console.log("Sending reply data:", replyData);

            const { data, error } = await supabase.from("inbox_messages").insert(replyData).select();

            console.log("Supabase response:", { data, error });

            if (error) {
                console.error("Supabase error:", error);
                throw error;
            }
            
            toast({ title: "Success", description: "Reply sent successfully!" });
            setReplyText("");
            setIsReplyDialogOpen(false);
            loadMessages();
        } catch (error) {
            console.error("Send reply error:", error);
            toast({ 
                title: "Error", 
                description: error?.message || "Failed to send reply. Please try again.", 
                variant: "destructive" 
            });
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Admin Inbox</h1>
                    <p className="text-muted-foreground">View and manage all user messages</p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={() => window.location.href = '/admin/chats'} className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        User Chats
                    </Button>
                    <Button onClick={() => window.location.href = '/admin/messages/create'} className="flex items-center gap-2">
                        <Send className="h-4 w-4" />
                        Send Message
                    </Button>
                </div>
            </div>

            {/* Unread Messages Alert */}
            {unreadCount > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <div className="flex items-center">
                        <Mail className="h-6 w-6 text-blue-600" />
                        <div>
                            <h3 className="text-lg font-semibold text-blue-900">You have {unreadCount} new message{unreadCount > 1 ? 's' : ''}</h3>
                            <p className="text-blue-700">Messages from users are waiting for your attention.</p>
                            <button 
                                onClick={() => window.location.href = '/admin/inbox'}
                                className="mt-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2"
                            >
                                View Messages
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Messages Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <div>
                            User Messages
                            <span className="text-sm text-muted-foreground ml-2">
                                {filteredMessages.length} total messages
                            </span>
                        </div>
                        <div className="flex gap-2">
                            <div className="relative">
                                <Input
                                    placeholder="Search messages..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10 pr-10"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery("")}
                                        className="absolute right-2 top-1/2 h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                                    >
                                        ×
                                    </button>
                                )}
                            </div>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={selectAllMessages}
                                disabled={filteredMessages.length === 0}
                            >
                                <CheckSquare className="h-4 w-4 mr-1" />
                                Select All
                            </Button>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={clearSelection}
                                disabled={selectedMessages.length === 0}
                            >
                                <Square className="h-4 w-4 mr-1" />
                                Clear
                            </Button>
                            {selectedMessages.length > 0 && (
                                <Button 
                                    variant="default" 
                                    size="sm" 
                                    onClick={markMessagesAsRead}
                                >
                                    <Mail className="h-4 w-4 mr-1" />
                                    Mark Read
                                </Button>
                            )}
                            {selectedMessages.length > 0 && (
                                <Button 
                                    variant="destructive" 
                                    size="sm" 
                                    onClick={deleteMessages}
                                >
                                    <Trash className="h-4 w-4 mr-1" />
                                    Delete
                                </Button>
                            )}
                        </div>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {filteredMessages.length === 0 ? (
                        <div className="text-center py-12">
                            <MessageSquare className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">No messages found</h3>
                            <p className="text-gray-600">No user messages in the inbox.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-left p-3">
                                            <div className="flex items-center">
                                                <Checkbox className="mr-2" />
                                                <span>User Info</span>
                                            </div>
                                        </th>
                                        <th className="text-left p-3">Subject</th>
                                        <th className="text-left p-3">Message Preview</th>
                                        <th className="text-left p-3">Date</th>
                                        <th className="text-left p-3">Status</th>
                                        <th className="text-left p-3">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredMessages.map((message) => (
                                        <tr key={message.id} className="border-b hover:bg-gray-50">
                                            <td className="p-3">
                                                <Checkbox 
                                                    checked={selectedMessages.includes(message.id)}
                                                    onChange={() => toggleMessageSelection(message.id)}
                                                    className="mr-2"
                                                />
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-sm font-medium">
                                                        {(message.userInfo?.username || message.userInfo?.first_name || "User").charAt(0)?.toUpperCase() || 'U'}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-white">
                                                            {message.userInfo?.username || 
                                                             message.userInfo?.first_name || 
                                                             "Unknown User"}
                                                        </div>
                                                        <div className="text-xs text-gray-300">
                                                            {message.userInfo?.email || ""}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-3">
                                                <span className="font-medium text-white">{message.subject}</span>
                                            </td>
                                            <td className="p-3">
                                                <div className="max-w-xs truncate text-gray-300" title={message.message}>
                                                    {message.message?.substring(0, 50)}{message.message && message.message.length > 50 ? "..." : ""}
                                                </div>
                                            </td>
                                            <td className="p-3">
                                                <small className="text-gray-300">{new Date(message.created_at).toLocaleDateString()}</small>
                                            </td>
                                            <td className="p-3">
                                                <Badge variant={message.is_read ? "secondary" : "default"}>
                                                    {message.is_read ? "Read" : "Unread"}
                                                </Badge>
                                            </td>
                                            <td className="p-3">
                                                <div className="flex gap-1">
                                                    <Button 
                                                        variant="outline" 
                                                        size="sm"
                                                        onClick={() => openReplyDialog(message)}
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                    <Button 
                                                        variant="outline" 
                                                        size="sm"
                                                        onClick={() => openReplyDialog(message)}
                                                    >
                                                        <Reply className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Reply Dialog */}
            {isReplyDialogOpen && selectedMessage && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-lg font-semibold text-black mb-2">Reply to Message</h3>
                                <div className="text-sm text-gray-700 mb-4">
                                    From: <span className="font-medium text-black">{selectedMessage.userInfo?.username || selectedMessage.userInfo?.first_name || "Unknown User"}</span>
                                </div>
                                <div className="mb-4">
                                    <div className="text-sm font-medium text-black mb-2">Original Message:</div>
                                    <div className="bg-gray-50 p-3 rounded text-sm">
                                        <div className="font-medium text-black mb-1">Subject: {selectedMessage.subject}</div>
                                        <div className="text-gray-800">{selectedMessage.message}</div>
                                    </div>
                                </div>
                            </div>
                            <button 
                                onClick={() => setIsReplyDialogOpen(false)}
                                className="text-black hover:text-gray-800 text-2xl font-bold bg-gray-200 hover:bg-gray-300 rounded-full w-8 h-8 flex items-center justify-center transition-colors"
                            >
                                ×
                            </button>
                        </div>
                        <div className="mt-4">
                            <textarea
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                placeholder="Type your reply..."
                                className="w-full p-3 border rounded-md text-black placeholder-gray-500 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                rows={4}
                            />
                            <div className="mt-4 flex justify-end gap-2">
                                <Button 
                                    variant="outline" 
                                    onClick={() => setIsReplyDialogOpen(false)}
                                >
                                    Cancel
                                </Button>
                                <Button 
                                    onClick={sendReply}
                                    disabled={isSending || !replyText.trim()}
                                >
                                    {isSending ? "Sending..." : "Send Reply"}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminInbox;
