import { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useAuth } from './AuthContext';
import api from '../lib/api';

const WishlistContext = createContext();

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};

export const WishlistProvider = ({ children }) => {
  const [wishlistItems, setWishlistItems] = useState([]);
  const [wishlistCategories, setWishlistCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user, token } = useAuth();

  // Load wishlist and categories when user changes
  useEffect(() => {
    if (user && token) {
      loadWishlistFromAPI();
      loadCategoriesFromAPI();
    } else {
      // If no user, load from localStorage with user-specific key
      loadWishlistFromLocalStorage();
      setWishlistCategories([]);
    }
  }, [user, token]);

  const loadCategoriesFromAPI = async () => {
    try {
      const response = await api.get('/wishlist/categories');
      setWishlistCategories(response.data.categories || []);
    } catch (error) {
      console.error('Error loading wishlist categories:', error);
    }
  };

  const loadWishlistFromAPI = async (categoryId = null) => {
    try {
      setLoading(true);
      const url = categoryId ? `/wishlist?category_id=${categoryId}` : '/wishlist';
      const response = await api.get(url);
      setWishlistItems(response.data.wishlist || []);
    } catch (error) {
      console.error('Error loading wishlist from API:', error);
      // Fallback to localStorage
      loadWishlistFromLocalStorage();
    } finally {
      setLoading(false);
    }
  };

  const loadWishlistFromLocalStorage = () => {
    try {
      const userId = user?.id || 'guest';
      const savedWishlist = localStorage.getItem(`wishlist_${userId}`);
      if (savedWishlist) {
        setWishlistItems(JSON.parse(savedWishlist));
      } else {
        setWishlistItems([]);
      }
    } catch (error) {
      console.error('Error loading wishlist from localStorage:', error);
      setWishlistItems([]);
    }
  };

  const saveWishlistToLocalStorage = (items) => {
    try {
      const userId = user?.id || 'guest';
      localStorage.setItem(`wishlist_${userId}`, JSON.stringify(items));
    } catch (error) {
      console.error('Error saving wishlist to localStorage:', error);
    }
  };

  const addToWishlist = async (product, categoryId = null, notes = '', priority = 1) => {
    const isAlreadyInWishlist = wishlistItems.some(item => item.id === product.id);
    
    if (isAlreadyInWishlist) {
      toast.info('Product is already in your wishlist');
      return;
    }

    // Optimistic update
    const newItems = [...wishlistItems, { ...product, category_id: categoryId, notes, priority }];
    setWishlistItems(newItems);

    if (user && token) {
      try {
        await api.post(`/wishlist/${product.id}`, {
          category_id: categoryId,
          notes,
          priority
        });
        toast.success('Added to wishlist');
        // Reload to get updated data with wishlist_id
        loadWishlistFromAPI();
      } catch (error) {
        console.error('Error adding to wishlist:', error);
        // Revert optimistic update
        setWishlistItems(wishlistItems);
        toast.error('Failed to add to wishlist');
      }
    } else {
      // Save to localStorage for guest users
      saveWishlistToLocalStorage(newItems);
      toast.success('Added to wishlist');
    }
  };

  const addToWishlistWithDialog = (product) => {
    // This function will be used by components to trigger the category dialog
    // The actual adding will be handled by the dialog component
    return { product, showDialog: true };
  };

  const removeFromWishlist = async (productId) => {
    // Optimistic update
    const newItems = wishlistItems.filter(item => item.id !== productId);
    setWishlistItems(newItems);

    if (user && token) {
      try {
        await api.delete(`/wishlist/${productId}`);
        toast.success('Removed from wishlist');
      } catch (error) {
        console.error('Error removing from wishlist:', error);
        // Revert optimistic update
        setWishlistItems(wishlistItems);
        toast.error('Failed to remove from wishlist');
      }
    } else {
      // Save to localStorage for guest users
      saveWishlistToLocalStorage(newItems);
      toast.success('Removed from wishlist');
    }
  };

  const updateWishlistItem = async (wishlistId, updates) => {
    if (!user || !token) {
      toast.error('Please login to update wishlist items');
      return;
    }

    try {
      await api.put(`/wishlist/${wishlistId}`, updates);
      toast.success('Wishlist item updated');
      loadWishlistFromAPI(); // Reload to get updated data
    } catch (error) {
      console.error('Error updating wishlist item:', error);
      toast.error('Failed to update wishlist item');
    }
  };

  const createCategory = async (categoryData) => {
    if (!user || !token) {
      toast.error('Please login to create categories');
      return null;
    }

    try {
      const response = await api.post('/wishlist/categories', categoryData);
      toast.success('Category created successfully');
      loadCategoriesFromAPI(); // Reload categories
      return response.data.category;
    } catch (error) {
      console.error('Error creating category:', error);
      toast.error(error.response?.data?.detail || 'Failed to create category');
      return null;
    }
  };

  const updateCategory = async (categoryId, updates) => {
    if (!user || !token) {
      toast.error('Please login to update categories');
      return;
    }

    try {
      await api.put(`/wishlist/categories/${categoryId}`, updates);
      toast.success('Category updated successfully');
      loadCategoriesFromAPI(); // Reload categories
    } catch (error) {
      console.error('Error updating category:', error);
      toast.error(error.response?.data?.detail || 'Failed to update category');
    }
  };

  const deleteCategory = async (categoryId) => {
    if (!user || !token) {
      toast.error('Please login to delete categories');
      return;
    }

    try {
      await api.delete(`/wishlist/categories/${categoryId}`);
      toast.success('Category deleted successfully');
      loadCategoriesFromAPI(); // Reload categories
      loadWishlistFromAPI(); // Reload wishlist as items may have moved
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error(error.response?.data?.detail || 'Failed to delete category');
    }
  };

  const isInWishlist = (productId) => {
    return wishlistItems.some(item => item.id === productId);
  };

  const clearWishlist = async (categoryId = null) => {
    // Optimistic update
    const previousItems = [...wishlistItems];
    if (categoryId) {
      setWishlistItems(prev => prev.filter(item => item.category_id !== categoryId));
    } else {
      setWishlistItems([]);
    }

    if (user && token) {
      try {
        const url = categoryId ? `/wishlist?category_id=${categoryId}` : '/wishlist';
        await api.delete(url);
        toast.success(categoryId ? 'Category cleared' : 'Wishlist cleared');
      } catch (error) {
        console.error('Error clearing wishlist:', error);
        // Revert optimistic update
        setWishlistItems(previousItems);
        toast.error('Failed to clear wishlist');
      }
    } else {
      // Clear localStorage for guest users
      saveWishlistToLocalStorage([]);
      toast.success('Wishlist cleared');
    }
  };

  const getWishlistCount = () => {
    return wishlistItems.length;
  };

  const getCategoryCount = (categoryId) => {
    return wishlistItems.filter(item => item.category_id === categoryId).length;
  };

  const toggleWishlist = (product, categoryId = null) => {
    if (isInWishlist(product.id)) {
      removeFromWishlist(product.id);
    } else {
      // For backward compatibility, if no categoryId is provided and user has categories,
      // we should ideally show the dialog, but for now we'll add to default category
      addToWishlist(product, categoryId);
    }
  };

  // Sync localStorage wishlist to API when user logs in
  const syncWishlistOnLogin = async () => {
    if (!user || !token) return;

    try {
      const guestUserId = 'guest';
      const guestWishlist = localStorage.getItem(`wishlist_${guestUserId}`);
      
      if (guestWishlist) {
        const guestItems = JSON.parse(guestWishlist);
        
        // Add guest items to user's wishlist
        for (const product of guestItems) {
          try {
            await api.post(`/wishlist/${product.id}`);
          } catch (error) {
            // Item might already exist, ignore error
            console.log('Item already in wishlist or error:', error);
          }
        }
        
        // Clear guest wishlist
        localStorage.removeItem(`wishlist_${guestUserId}`);
        
        // Reload user's wishlist
        await loadWishlistFromAPI();
        
        if (guestItems.length > 0) {
          toast.success(`Synced ${guestItems.length} items to your wishlist`);
        }
      }
    } catch (error) {
      console.error('Error syncing wishlist:', error);
    }
  };

  // Call sync when user logs in
  useEffect(() => {
    if (user && token) {
      syncWishlistOnLogin();
    }
  }, [user?.id]); // Only trigger when user ID changes (login/logout)

  const value = {
    wishlistItems,
    wishlistCategories,
    loading,
    addToWishlist,
    addToWishlistWithDialog,
    removeFromWishlist,
    updateWishlistItem,
    createCategory,
    updateCategory,
    deleteCategory,
    isInWishlist,
    clearWishlist,
    getWishlistCount,
    getCategoryCount,
    toggleWishlist,
    syncWishlistOnLogin,
    loadWishlistFromAPI,
    loadCategoriesFromAPI,
  };

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
};