import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import api from '../lib/api';
import { toast } from 'sonner';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const { user, token, isAdmin } = useAuth();

  // Fetch notifications when user changes
  useEffect(() => {
    if (user && token) {
      fetchNotifications();
      fetchUnreadCount();
      
      // Set up polling for real-time updates
      const interval = setInterval(() => {
        fetchUnreadCount();
      }, 30000); // Check every 30 seconds
      
      return () => clearInterval(interval);
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [user, token]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const endpoint = isAdmin ? '/admin/notifications' : '/notifications';
      const response = await api.get(endpoint);
      setNotifications(response.data.notifications || []);
      setUnreadCount(response.data.unread_count || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const endpoint = isAdmin ? '/admin/notifications/unread-count' : '/notifications/unread-count';
      const response = await api.get(endpoint);
      setUnreadCount(response.data.unread_count || 0);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const endpoint = isAdmin 
        ? `/admin/notifications/${notificationId}/read`
        : `/notifications/${notificationId}/read`;
      
      await api.put(endpoint);
      
      // Update local state
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, read: true }
            : notif
        )
      );
      
      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1));
      
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Failed to mark notification as read');
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/mark-all-read');
      
      // Update local state
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, read: true }))
      );
      setUnreadCount(0);
      
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      toast.error('Failed to mark all notifications as read');
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await api.delete(`/notifications/${notificationId}`);
      
      // Update local state
      const deletedNotification = notifications.find(n => n.id === notificationId);
      setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
      
      // Update unread count if deleted notification was unread
      if (deletedNotification && !deletedNotification.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      
      toast.success('Notification deleted');
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Failed to delete notification');
    }
  };

  const clearAllNotifications = async () => {
    try {
      await api.delete('/notifications');
      setNotifications([]);
      setUnreadCount(0);
      toast.success('All notifications cleared');
    } catch (error) {
      console.error('Error clearing notifications:', error);
      toast.error('Failed to clear notifications');
    }
  };

  // Helper function to get notification icon based on type
  const getNotificationIcon = (type) => {
    const iconMap = {
      'order_tracking': '📦',
      'order_placed': '🛒',
      'new_order': '🆕',
      'role_change': '👤',
      'seller_request': '🏪',
      'seller_approved': '✅',
      'supplier_status': '🏭',
      'profile_update': '📝',
      'password_change': '🔒',
      'phone_update': '📱',
      'email_update': '📧',
      'wishlist': '❤️',
      'payment': '💳',
      'refund': '💰',
      'return': '↩️',
      'system': '⚙️',
      'promotion': '🎉',
      'security': '🔐'
    };
    return iconMap[type] || '🔔';
  };

  const value = {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    getNotificationIcon,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};