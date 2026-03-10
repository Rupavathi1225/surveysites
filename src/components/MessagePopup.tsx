import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Mail, X, ExternalLink } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface MessagePopupProps {
  userRole: "admin" | "user";
}

const MessagePopup = ({ userRole }: MessagePopupProps) => {
  const { profile } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [hasShown, setHasShown] = useState(false);

  const clearSessionStorage = () => {
    sessionStorage.removeItem(`messagePopupShown_${userRole}`);
    setHasShown(false);
    console.log("MessagePopup: Session storage cleared, popup will show again");
  };

  const loadUnreadCount = async () => {
    if (!profile) return;

    console.log("MessagePopup: Loading unread count for user", profile.id, "role:", userRole);

    let query = supabase.from("inbox_messages").select("*").eq("is_read", false);

    if (userRole === "admin") {
      query = query.eq("from_name", "User");
      console.log("MessagePopup: Querying for admin - messages from users");
    } else {
      query = query.eq("user_id", profile.id).eq("from_name", "Admin");
      console.log("MessagePopup: Querying for user - messages from admin");
    }

    const { data, error } = await query;
    
    if (error) {
      console.error("MessagePopup: Error loading unread count:", error);
      return;
    }

    console.log("MessagePopup: Unread messages found:", data?.length || 0, data);
    setUnreadCount(data?.length || 0);

    // Show popup if there are unread messages and hasn't been shown
    if (data && data.length > 0 && !hasShown) {
      console.log("MessagePopup: Showing popup for existing unread messages");
      setIsVisible(true);
      setHasShown(true);
      sessionStorage.setItem(`messagePopupShown_${userRole}`, "true");
    } else {
      console.log("MessagePopup: No popup shown - unread count:", data?.length || 0, "hasShown:", hasShown);
    }
  };

  const handleAutoRedirect = () => {
    setIsVisible(false);
    setHasShown(true);
    sessionStorage.setItem(`messagePopupShown_${userRole}`, "true");
    
    // Redirect to appropriate inbox
    if (userRole === "admin") {
      window.location.href = "/admin/inbox";
    } else {
      window.location.href = "/dashboard/inbox";
    }
  };

  const handleViewMessages = () => {
    handleAutoRedirect();
  };

  const handleClose = () => {
    setIsVisible(false);
    setHasShown(true);
    sessionStorage.setItem(`messagePopupShown_${userRole}`, "true");
  };

  // Set up real-time subscription
  useEffect(() => {
    console.log("MessagePopup: Initializing for user", profile?.id, "role:", userRole);
    
    if (!profile) {
      console.log("MessagePopup: No profile found, exiting");
      return;
    }

    // Check if popup was already shown in this session
    const sessionShown = sessionStorage.getItem(`messagePopupShown_${userRole}`);
    console.log("MessagePopup: Session shown status:", sessionShown);
    
    // Always load unread count and show popup if there are messages
    loadUnreadCount();

    // Set up real-time subscription
    console.log("MessagePopup: Setting up real-time subscription");
    const subscription = supabase
      .channel('inbox_messages')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'inbox_messages',
          filter: userRole === 'admin' ? 'from_name=eq.User' : `user_id=eq.${profile.id}`
        }, 
        (payload) => {
          console.log('MessagePopup: Real-time event received:', payload);
          const newMessage = payload.new;
          
          if (!newMessage) {
            console.log("MessagePopup: No message in payload, skipping");
            return;
          }
          
          console.log('MessagePopup: Processing message:', {
            id: newMessage.id,
            from_name: newMessage.from_name,
            user_id: newMessage.user_id,
            subject: newMessage.subject,
            currentUser: profile.id,
            userRole: userRole
          });
          
          // Check if this message is for the current user
          if (userRole === 'user' && newMessage.user_id !== profile.id) {
            console.log('MessagePopup: Message not for this user, skipping', {
              messageUserId: newMessage.user_id,
              currentUserId: profile.id
            });
            return;
          }
          
          if (userRole === 'admin' && newMessage.from_name !== 'User') {
            console.log('MessagePopup: Message not from user, skipping', {
              messageFrom: newMessage.from_name
            });
            return;
          }
          
          console.log('MessagePopup: Message is for current user, showing popup');
          setUnreadCount(prev => prev + 1);
          
          // ALWAYS show popup for new messages, regardless of session storage
          console.log('MessagePopup: Showing popup for new message');
          setIsVisible(true);
          setHasShown(true);
          sessionStorage.setItem(`messagePopupShown_${userRole}`, "true");
          
          // Auto redirect after 3 seconds
          setTimeout(() => {
            console.log('MessagePopup: Executing auto redirect');
            handleAutoRedirect();
          }, 3000);
          
          toast({
            title: "New Message",
            description: "You have received a new message",
            variant: "default",
          });
        }
      )
      .subscribe((status) => {
        console.log('MessagePopup: Subscription status:', status);
      });

    return () => {
      console.log('MessagePopup: Cleaning up subscription');
      subscription.unsubscribe();
    };
  }, [profile, userRole]);

  // Add this to window for testing in browser console
  useEffect(() => {
    (window as any).clearMessagePopup = clearSessionStorage;
    (window as any).testUserPopup = () => {
      console.log("MessagePopup: Manual test trigger");
      setIsVisible(true);
      setUnreadCount(1);
    };
    (window as any).checkPopupStatus = () => {
      console.log("MessagePopup Status:", {
        profile: profile?.id,
        userRole,
        hasShown,
        isVisible,
        unreadCount,
        sessionShown: sessionStorage.getItem(`messagePopupShown_${userRole}`)
      });
    };
    (window as any).forcePopupForUser = () => {
      console.log("MessagePopup: Forcing popup for testing");
      setIsVisible(true);
      setUnreadCount(1);
      setHasShown(false);
      sessionStorage.removeItem(`messagePopupShown_${userRole}`);
    };
    (window as any).testDirectMessage = () => {
      console.log("MessagePopup: Testing direct message simulation");
      // Directly test popup logic
      setIsVisible(true);
      setUnreadCount(prev => prev + 1);
      setHasShown(true);
      sessionStorage.setItem(`messagePopupShown_${userRole}`, "true");
      
      toast({
        title: "Test Message",
        description: "This is a test popup notification",
        variant: "default",
      });
    };
    
    // Add immediate test function
    (window as any).testImmediatePopup = () => {
      console.log("MessagePopup: Testing immediate popup display");
      setIsVisible(true);
      setUnreadCount(1);
      setHasShown(true);
      sessionStorage.setItem(`messagePopupShown_${userRole}`, "true");
      
      toast({
        title: "Immediate Test Popup",
        description: "This popup should appear immediately!",
        variant: "default",
      });
    };
    
    return () => {
      delete (window as any).clearMessagePopup;
      delete (window as any).testUserPopup;
      delete (window as any).checkPopupStatus;
      delete (window as any).forcePopupForUser;
      delete (window as any).testDirectMessage;
      delete (window as any).testImmediatePopup;
    };
  }, [userRole, profile, hasShown, isVisible, unreadCount]);

  if (!isVisible || unreadCount === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-2xl border-0">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Bell className="h-6 w-6 animate-pulse" />
                <Badge className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center p-0">
                  {unreadCount}
                </Badge>
              </div>
              <div>
                <h3 className="font-semibold">New Messages</h3>
                <p className="text-sm opacity-90">
                  You have {unreadCount} unread {unreadCount === 1 ? 'message' : 'messages'}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="text-white hover:bg-white/20 p-1 h-6 w-6"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-2">
            <div className="bg-white/10 rounded p-3 mb-3">
              <p className="text-sm font-medium">You have received a new message!</p>
              <p className="text-xs opacity-75 mt-1">Click below to view your messages</p>
            </div>
            
            <div className="text-xs opacity-75 flex items-center gap-1">
              <ExternalLink className="h-3 w-3" />
              Auto-redirecting in 3 seconds...
            </div>
            <Button
              onClick={handleViewMessages}
              className="w-full bg-white text-blue-600 hover:bg-gray-100 font-medium"
            >
              <Mail className="h-4 w-4 mr-2" />
              View Messages
            </Button>
            <Button
              variant="outline"
              onClick={handleClose}
              className="w-full border-white text-white hover:bg-white/20"
            >
              Dismiss
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MessagePopup;
