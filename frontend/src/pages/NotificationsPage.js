import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Bell,
  BellRing,
  Check,
  CheckCheck,
  Trash2,
  ArrowLeft,
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
  Filter,
  Search
} from 'lucide-react';
import { useNotifications } from '../contexts/NotificationContext';
import { usePopup } from '../contexts/PopupContext';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

const NotificationIcon = ({ type, className = "w-5 h-5" }) => {
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

const NotificationCard = ({ notification, onMarkAsRead, onDelete }) => {
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
    return date.toLocaleString();
  };

  const getNotificationColor = (type) => {
    const colorMap = {
      'order_tracking': 'border-blue-200 bg-blue-50',
      'order_placed': 'border-green-200 bg-green-50',
      'new_order': 'border-blue-200 bg-blue-50',
      'role_change': 'border-purple-200 bg-purple-50',
      'seller_request': 'border-orange-200 bg-orange-50',
      'seller_approved': 'border-green-200 bg-green-50',
      'supplier_status': 'border-indigo-200 bg-indigo-50',
      'profile_update': 'border-gray-200 bg-gray-50',
      'password_change': 'border-red-200 bg-red-50',
      'phone_update': 'border-blue-200 bg-blue-50',
      'email_update': 'border-blue-200 bg-blue-50',
      'wishlist': 'border-pink-200 bg-pink-50',
      'payment': 'border-green-200 bg-green-50',
      'refund': 'border-yellow-200 bg-yellow-50',
      'return': 'border-orange-200 bg-orange-50',
      'system': 'border-gray-200 bg-gray-50',
      'promotion': 'border-purple-200 bg-purple-50',
      'security': 'border-red-200 bg-red-50'
    };
    return colorMap[type] || 'border-gray-200 bg-gray-50';
  };

  const getIconColor = (type) => {
    const colorMap = {
      'order_tracking': 'text-blue-600',
      'order_placed': 'text-green-600',
      'new_order': 'text-blue-600',
      'role_change': 'text-purple-600',
      'seller_request': 'text-orange-600',
      'seller_approved': 'text-green-600',
      'supplier_status': 'text-indigo-600',
      'profile_update': 'text-gray-600',
      'password_change': 'text-red-600',
      'phone_update': 'text-blue-600',
      'email_update': 'text-blue-600',
      'wishlist': 'text-pink-600',
      'payment': 'text-green-600',
      'refund': 'text-yellow-600',
      'return': 'text-orange-600',
      'system': 'text-gray-600',
      'promotion': 'text-purple-600',
      'security': 'text-red-600'
    };
    return colorMap[type] || 'text-gray-600';
  };

  return (
    <Card
      className={`cursor-pointer transition-all duration-200 hover:shadow-md ${!notification.read
        ? `${getNotificationColor(notification.type)} border-l-4`
        : 'bg-white border-gray-200'
        }`}
      onClick={handleClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className={`mt-1 ${getIconColor(notification.type)}`}>
            <NotificationIcon type={notification.type} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className={`font-semibold ${!notification.read ? 'text-gray-900' : 'text-gray-700'}`}>
                  {notification.title}
                </h3>
                <p className="text-gray-600 mt-1">
                  {notification.message}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {!notification.read && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(notification.id);
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between mt-3">
              <span className="text-sm text-gray-500">
                {formatTime(notification.created_at)}
              </span>

              <div className="flex items-center gap-2">
                {notification.data?.order_number && (
                  <Badge variant="outline" className="text-xs">
                    #{notification.data.order_number}
                  </Badge>
                )}

                <Badge variant="secondary" className="text-xs capitalize">
                  {notification.type.replace('_', ' ')}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default function NotificationsPage() {
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


  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Filter notifications based on search and filters
  const filteredNotifications = notifications.filter(notification => {
    const matchesSearch = notification.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      notification.message.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = filterType === 'all' || notification.type === filterType;

    const matchesStatus = filterStatus === 'all' ||
      (filterStatus === 'unread' && !notification.read) ||
      (filterStatus === 'read' && notification.read);

    return matchesSearch && matchesType && matchesStatus;
  });

  // Group notifications by date
  const groupedNotifications = {};
  filteredNotifications.forEach(notification => {
    const date = new Date(notification.created_at);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let groupKey;
    if (date.toDateString() === today.toDateString()) {
      groupKey = 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      groupKey = 'Yesterday';
    } else {
      groupKey = date.toLocaleDateString();
    }

    if (!groupedNotifications[groupKey]) {
      groupedNotifications[groupKey] = [];
    }
    groupedNotifications[groupKey].push(notification);
  });

  const handleClearAll = () => {
    showPopup({
      title: "Clear All Notifications",
      message: "Are you sure you want to clear all notifications? This action cannot be undone.",
      type: "warning",
      onConfirm: clearAllNotifications
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <BellRing className="w-8 h-8" />
                Notifications
              </h1>
              <p className="text-gray-600">
                {unreadCount > 0 ? (
                  <>You have {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}</>
                ) : (
                  'All caught up!'
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="outline"
                onClick={markAllAsRead}
                className="flex items-center gap-2"
              >
                <CheckCheck className="w-4 h-4" />
                Mark all read
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="outline"
                onClick={handleClearAll}
                className="flex items-center gap-2 text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
                Clear all
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search notifications..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="order_tracking">Order Tracking</SelectItem>
                  <SelectItem value="order_placed">Order Placed</SelectItem>
                  <SelectItem value="role_change">Role Changes</SelectItem>
                  <SelectItem value="profile_update">Profile Updates</SelectItem>
                  <SelectItem value="seller_request">Seller Requests</SelectItem>
                  <SelectItem value="supplier_status">Supplier Status</SelectItem>
                  <SelectItem value="payment">Payments</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full md:w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="unread">Unread</SelectItem>
                  <SelectItem value="read">Read</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
          </div>
        ) : Object.keys(groupedNotifications).length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Bell className="w-16 h-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {searchQuery || filterType !== 'all' || filterStatus !== 'all'
                  ? 'No matching notifications'
                  : 'No notifications yet'
                }
              </h3>
              <p className="text-gray-600">
                {searchQuery || filterType !== 'all' || filterStatus !== 'all'
                  ? 'Try adjusting your search or filters'
                  : "We'll notify you when something important happens"
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedNotifications).map(([date, dateNotifications]) => (
              <div key={date}>
                <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  {date}
                  <Badge variant="secondary" className="text-xs">
                    {dateNotifications.length}
                  </Badge>
                </h2>
                <div className="space-y-3">
                  {dateNotifications.map((notification) => (
                    <NotificationCard
                      key={notification.id}
                      notification={notification}
                      onMarkAsRead={markAsRead}
                      onDelete={deleteNotification}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}