"use client"

import React, { useState, useEffect } from 'react';
import { Bell, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { notificationAPI, type Notification } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { Switch } from '@/components/ui/switch';
import { getPushSubscription, subscribeToPush, unsubscribeFromPush, isPushSupported } from '@/components/PwaRegister';

export function NotificationDropdown() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isPushEnabled, setIsPushEnabled] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check standalone mode
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || (navigator as any).standalone === true;
    setIsStandalone(standalone);
    async function checkSubscription() {
      const supported = await isPushSupported();
      setPushSupported(supported);
      if (supported) {
        const sub = await getPushSubscription();
        setIsPushEnabled(!!sub);
      }
    }
    checkSubscription();

    const handleSubChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      setIsPushEnabled(!!customEvent.detail);
    };

    window.addEventListener('push-subscription-change', handleSubChange);
    return () => {
      window.removeEventListener('push-subscription-change', handleSubChange);
    };
  }, []);

  const handlePushToggle = async (checked: boolean) => {
    try {
      if (checked) {
        await subscribeToPush();
        alert('Mobile push notifications enabled successfully!');
      } else {
        await unsubscribeFromPush();
        alert('Mobile push notifications disabled.');
      }
    } catch (error: any) {
      console.error('Failed to toggle push subscription:', error);
      alert(`Failed to toggle push notifications: ${error.message || error}`);
      setIsPushEnabled(!checked);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await notificationAPI.getNotifications();
      setNotifications(response.data);
      setUnreadCount(response.data.filter((n) => !n.read_at).length);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll for new notifications every minute
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationAPI.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationAPI.markAllAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read_at: new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read_at) {
      await handleMarkAsRead(notification.id);
    }
    if (notification.data.url) {
      router.push(notification.data.url);
    }
    setIsOpen(false);
  };

  return (
    <div className="flex items-center gap-2">
      {!isStandalone && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => window.dispatchEvent(new CustomEvent('pwa-trigger-install'))}
          className="text-muted-foreground hover:text-foreground transition-colors"
          title="Install App"
        >
          <Download className="h-5 w-5" />
        </Button>
      )}
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-600" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          <DropdownMenuLabel className="flex justify-between items-center">
            <span>Notifications</span>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-auto p-0 text-blue-600 hover:bg-transparent"
                onClick={handleMarkAllAsRead}
              >
                Mark all as read
              </Button>
            )}
          </DropdownMenuLabel>
          
          {pushSupported && (
            <>
              <DropdownMenuSeparator />
              <div className="flex items-center justify-between px-3 py-2 text-sm bg-muted/20">
                <span className="font-medium text-xs text-muted-foreground">Mobile Push Notifications</span>
                <Switch
                  checked={isPushEnabled}
                  onCheckedChange={handlePushToggle}
                  className="scale-75"
                />
              </div>
            </>
          )}
          
          <DropdownMenuSeparator />
          <div className="max-h-[300px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No notifications
              </div>
            ) : (
              notifications.map((notification) => (
                <DropdownMenuItem
                  key={notification.id}
                  className={`flex flex-col items-start p-3 cursor-pointer ${!notification.read_at ? 'bg-muted/50' : ''
                    }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="text-sm font-medium">{notification.data.message}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(notification.created_at), {
                      addSuffix: true,
                    })}
                  </div>
                </DropdownMenuItem>
              ))
            )}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
