import { createContext, useContext, useState, ReactNode } from "react";

export interface Product {
  id: string;
  name: string;
  price: number;
  original_price?: number;
  image_url: string;
  image_urls?: string[];
  rating: number;
  category: string;
  gender: string;
  stock: number;
  selectedSize?: string;
  selectedColor?: string;
}

interface CartItem {
  product: Product;
  quantity: number;
}

interface CartContextType {
  cart: Product[];
  items: CartItem[];
  favorites: Product[];
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  addToFavorites: (product: Product) => void;
  removeFromFavorites: (productId: string) => void;
  isFavorite: (productId: string) => boolean;
  cartCount: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [favorites, setFavorites] = useState<Product[]>([]);

  const addToCart = (product: Product) => {
    setItems((prev) => {
      // Create unique key with size and color
      const itemKey = `${product.id}-${product.selectedSize || ''}-${product.selectedColor || ''}`;
      const existingItem = prev.find((item) => {
        const key = `${item.product.id}-${item.product.selectedSize || ''}-${item.product.selectedColor || ''}`;
        return key === itemKey;
      });
      if (existingItem) {
        return prev.map((item) => {
          const key = `${item.product.id}-${item.product.selectedSize || ''}-${item.product.selectedColor || ''}`;
          return key === itemKey
            ? { ...item, quantity: item.quantity + 1 }
            : item;
        });
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setItems((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity < 1) {
      removeFromCart(productId);
      return;
    }
    setItems((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const addToFavorites = (product: Product) => {
    setFavorites((prev) => {
      if (prev.some((p) => p.id === product.id)) {
        return prev;
      }
      return [...prev, product];
    });
  };

  const removeFromFavorites = (productId: string) => {
    setFavorites((prev) => prev.filter((p) => p.id !== productId));
  };

  const isFavorite = (productId: string) => {
    return favorites.some((p) => p.id === productId);
  };

  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  // Create cart array for compatibility
  const cart = items.flatMap(item => Array(item.quantity).fill(item.product));

  return (
    <CartContext.Provider value={{ 
      cart, 
      items, 
      favorites,
      addToCart, 
      removeFromCart, 
      updateQuantity, 
      addToFavorites,
      removeFromFavorites,
      isFavorite,
      cartCount, 
      totalPrice 
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }
  return context;
};
