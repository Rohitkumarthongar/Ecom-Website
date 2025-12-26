import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
// import { ScrollArea } from './ui/scroll-area';
import {
  Bell,
  BellRing,
  Check,
  CheckCheck,
  Trash2,
  X,
  Package,
  ShoppingCart,
  User,
  Store,
  Settings,
  Shield,
  Phone,
  Mail,
  Heart,
  CreditCard,
  RotateCcw,
  AlertCircle,
  Gift,
  Clock
} from 'lucide-react';
import { useNotifications } from '../contexts/NotificationContext';
import { usePopup } from '../contexts/PopupContext';

const NotificationIcon = ({ type, className = "w-4 h-4" }) => {
  const iconMap = {
    'order_tracking': Package,
    'order_placed': ShoppingCart,
    'new_order': ShoppingCart,
    'role_change': User,
    'seller_request': Store,
    'seller_approved': Check,
    'supplier_status': Store,
    'profile_update': Settings,
    'password_change': Shield,
    'phone_update': Phone,
    'email_update': Mail,
    'wishlist': Heart,
    'payment': CreditCard,
    'refund': RotateCcw,
    'return': RotateCcw,
    'system': AlertCircle,
    'promotion': Gift,
    'security': Shield
  };

  const IconComponent = iconMap[type] || Bell;
  return <IconComponent className={className} />;
};

const NotificationItem = ({ notification, onMarkAsRead, onDelete }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (!notification.read) {
      onMarkAsRead(notification.id);
    }

    // Navigate based on notification type
    const navigationMap = {
      'order_tracking': `/orders/${notification.data?.order_id}`,
      'order_placed': `/orders/${notification.data?.order_id}`,
      'new_order': `/admin/orders`,
      'seller_request': '/admin/seller-requests',
      'profile_update': '/profile',
      'role_change': '/profile',
      'supplier_status': '/profile'
    };

    const path = navigationMap[notification.type];
    if (path) {
      navigate(path);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;

    return date.toLocaleDateString();
  };

  const getNotificationColor = (type) => {
    const colorMap = {
      'order_tracking': 'text-blue-500',
      'order_placed': 'text-green-500',
      'new_order': 'text-blue-500',
      'role_change': 'text-purple-500',
      'seller_request': 'text-orange-500',
      'seller_approved': 'text-green-500',
      'supplier_status': 'text-indigo-500',
      'profile_update': 'text-gray-500',
      'password_change': 'text-red-500',
      'phone_update': 'text-blue-500',
      'email_update': 'text-blue-500',
      'wishlist': 'text-pink-500',
      'payment': 'text-green-500',
      'refund': 'text-yellow-500',
      'return': 'text-orange-500',
      'system': 'text-gray-500',
      'promotion': 'text-purple-500',
      'security': 'text-red-500'
    };
    return colorMap[type] || 'text-gray-500';
  };

  return (
    <div
      className={`p-3 border-b border-border hover:bg-muted/50 cursor-pointer transition-colors ${!notification.read ? 'bg-primary/5' : ''
        }`}
      onClick={handleClick}
    >
      <div className="flex items-start gap-3">
        <div className={`mt-1 ${getNotificationColor(notification.type)}`}>
          <NotificationIcon type={notification.type} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className={`text-sm font-medium ${!notification.read ? 'text-foreground' : 'text-muted-foreground'}`}>
              {notification.title}
            </h4>
            <div className="flex items-center gap-1">
              {!notification.read && (
                <div className="w-2 h-2 bg-primary rounded-full" />
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(notification.id);
                }}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {notification.message}
          </p>

          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-muted-foreground">
              {formatTime(notification.created_at)}
            </span>

            {notification.data?.order_number && (
              <Badge variant="outline" className="text-xs">
                #{notification.data.order_number}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default function NotificationDropdown() {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications
  } = useNotifications();
  const { showPopup } = usePopup();

  const [open, setOpen] = useState(false);

  const handleMarkAllAsRead = () => {
    markAllAsRead();
  };

  const handleClearAll = () => {
    showPopup({
      title: "Clear Notifications",
      message: "Are you sure you want to clear all notifications?",
      type: "warning",
      onConfirm: clearAllNotifications
    });
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          {unreadCount > 0 ? (
            <BellRing className="w-5 h-5" />
          ) : (
            <Bell className="w-5 h-5" />
          )}
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-80 p-0"
        sideOffset={5}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between mb-2">
            <CardTitle className="text-base font-semibold">Notifications</CardTitle>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAllAsRead}
                  className="h-8 px-2 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-4 h-4 mr-1.5" />
                  Mark all read
                </Button>
              )}
              {notifications.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAll}
                  className="h-8 px-2 text-xs font-medium text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                  title="Clear all notifications"
                >
                  <Trash2 className="w-4 h-4 mr-1.5" />
                  Clear
                </Button>
              )}
            </div>
          </div>
          {unreadCount > 0 && (
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              You have {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
            </p>
          )}
        </CardHeader>

        <DropdownMenuSeparator />

        <div className="h-96 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Bell className="w-12 h-12 text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                We'll notify you when something important happens
              </p>
            </div>
          ) : (
            <div className="group">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={markAsRead}
                  onDelete={deleteNotification}
                />
              ))}
            </div>
          )}
        </div>

        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="p-2">
              <Button
                variant="ghost"
                className="w-full text-xs h-8"
                onClick={() => {
                  setOpen(false);
                  navigate('/notifications');
                }}
              >
                View all notifications
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}