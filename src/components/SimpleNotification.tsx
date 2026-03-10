import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, Mail, X, ExternalLink } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface SimpleNotificationProps {
  message: {
    id: string;
    from_name: string;
    user_id?: string;
    subject: string;
    message: string;
    created_at: string;
  };
  userRole: 'admin' | 'user';
  onClose: () => void;
  onViewMessages: () => void;
}

const SimpleNotification = ({ message, userRole, onClose, onViewMessages }: SimpleNotificationProps) => {
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleRedirect = () => {
    if (userRole === 'admin') {
      window.location.href = '/admin/inbox';
    } else {
      window.location.href = '/dashboard/inbox';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm animate-in">
      <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-2xl border-0">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Bell className="h-6 w-6 animate-pulse" />
                <Badge className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center p-0">
                  1
                </Badge>
              </div>
              <div>
                <h3 className="font-semibold">New Message</h3>
                <p className="text-sm opacity-90">
                  {message.from_name === 'Admin' ? 'Admin' : 'User'} sent you a message
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white hover:bg-white/20 p-1 h-6 w-6"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-2">
            <div className="bg-white/10 rounded p-3 mb-3">
              <p className="text-sm font-medium">{message.subject}</p>
              <p className="text-xs opacity-75 mt-1">{message.message}</p>
            </div>
            
            <div className="text-xs opacity-75 flex items-center gap-1">
              <ExternalLink className="h-3 w-3" />
              Auto-redirecting in {countdown} seconds...
            </div>
            <Button
              onClick={handleRedirect}
              className="w-full bg-white text-blue-600 hover:bg-gray-100 font-medium"
            >
              <Mail className="h-4 w-4 mr-2" />
              View Messages
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
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

export default SimpleNotification;
