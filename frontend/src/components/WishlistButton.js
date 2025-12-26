import { useState } from 'react';
import { Button } from './ui/button';
import { Heart } from 'lucide-react';
import { useWishlist } from '../contexts/WishlistContext';
import { useAuth } from '../contexts/AuthContext';
import WishlistCategoryDialog from './WishlistCategoryDialog';

export default function WishlistButton({ 
  product, 
  className = "", 
  size = "sm",
  variant = "ghost",
  showText = false,
  children 
}) {
  const { isInWishlist, removeFromWishlist, addToWishlist, wishlistCategories } = useWishlist();
  const { user } = useAuth();
  const [showDialog, setShowDialog] = useState(false);
  
  const isInWish = isInWishlist(product.id);

  const handleClick = (e) => {
    e.stopPropagation();
    
    if (isInWish) {
      removeFromWishlist(product.id);
    } else {
      // If user is logged in, always show the dialog for category selection
      // If user is not logged in, add to localStorage directly
      if (user) {
        setShowDialog(true);
      } else {
        // For guest users, add directly to localStorage
        addToWishlist(product);
      }
    }
  };

  const handleAddToWishlist = async (product, categoryId, notes, priority) => {
    await addToWishlist(product, categoryId, notes, priority);
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleClick}
        className={`${isInWish ? 'text-red-500 hover:text-red-600' : ''} ${className}`}
      >
        <Heart className={`w-4 h-4 ${showText ? 'mr-2' : ''} ${isInWish ? 'fill-current' : ''}`} />
        {showText && (isInWish ? 'Remove from Wishlist' : 'Add to Wishlist')}
        {children}
      </Button>

      {user && (
        <WishlistCategoryDialog
          open={showDialog}
          onClose={() => setShowDialog(false)}
          product={product}
          onAddToWishlist={handleAddToWishlist}
        />
      )}
    </>
  );
}