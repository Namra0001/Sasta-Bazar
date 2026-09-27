import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Navbar } from "@/components/Navbar";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Trash2, ShoppingBag, Heart, ShoppingCart, Bell } from "lucide-react";
import { CheckoutDialog } from "@/components/CheckoutDialog";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface CartProps {
  onLogout: () => void;
}

export const Cart = ({ onLogout }: CartProps) => {
  const { items, favorites, removeFromCart, updateQuantity, cartCount, totalPrice, addToCart, removeFromFavorites } = useCart();
  const [searchQuery, setSearchQuery] = useState("");
  const [checkoutProduct, setCheckoutProduct] = useState<{ id: string; name: string; price: number; quantity: number; size?: string; color?: string; imageUrl?: string } | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [priceAlertsList, setPriceAlertsList] = useState<any[]>([]);

  useEffect(() => {
    checkPriceAlerts();
  }, []);

  const checkPriceAlerts = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      
      const { data: alerts } = await supabase
        .from("price_alerts")
        .select(`
          id, target_price, is_active, product_id,
          product:products(id, name, price, image_url)
        `)
        .eq("user_id", userData.user.id);
        
      if (alerts && alerts.length > 0) {
        setPriceAlertsList(alerts);
        let updated = false;
        alerts.forEach((alert: any) => {
          // If the product is loaded and price dropped
          if (alert.is_active && alert.product && alert.product.price <= alert.target_price) {
            toast({
              title: "Price Drop Alert! 🚨",
              description: `${alert.product.name} is now available at ₹${alert.product.price} (your target was ₹${alert.target_price})`,
              duration: 8000,
            });
            // Set inactive to avoid duplicate notifications
            supabase.from("price_alerts").update({ is_active: false }).eq("id", alert.id).then();
            alert.is_active = false;
            updated = true;
          }
        });
        if (updated) {
          setPriceAlertsList([...alerts]);
        }
      }
    } catch (e) {
      console.error("Error checking price alerts:", e);
    }
  };

  const removePriceAlert = async (alertId: string) => {
    try {
      await supabase.from("price_alerts").delete().eq("id", alertId);
      setPriceAlertsList(prev => prev.filter(a => a.id !== alertId));
      toast({ title: "Alert Removed", description: "Price alert has been deleted." });
    } catch (e) {
      console.error(e);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleCartClick = () => {
    // Already on cart page
  };

  const handleBuyProduct = (productId: string, productName: string, productPrice: number, quantity: number, size?: string, color?: string, imageUrl?: string) => {
    setCheckoutProduct({ id: productId, name: productName, price: productPrice, quantity, size, color, imageUrl });
  };

  const handleOrderSuccess = (productId: string) => {
    removeFromCart(productId);
  };

  const handleAddFavoriteToCart = (product: any) => {
    addToCart(product);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar 
        cartCount={cartCount}
        onSearch={handleSearch}
        onCartClick={handleCartClick}
        onLogout={onLogout}
      />
      
      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="cart" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="cart" className="flex gap-2">
              <ShoppingCart className="h-4 w-4" />
              Cart ({cartCount})
            </TabsTrigger>
            <TabsTrigger value="wishlist" className="flex gap-2">
              <Heart className="h-4 w-4" />
              Wishlist ({favorites.length})
            </TabsTrigger>
            <TabsTrigger value="alerts" className="flex gap-2">
              <Bell className="h-4 w-4" />
              Price Alerts ({priceAlertsList.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="cart">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-2">Shopping Cart</h1>
              <p className="text-muted-foreground">
                {items.length === 0 ? "Your cart is empty" : `You have ${cartCount} item${cartCount !== 1 ? 's' : ''} in your cart`}
              </p>
            </div>

            {items.length === 0 ? (
              <Card className="p-12 text-center">
                <CardContent>
                  <ShoppingBag className="h-24 w-24 mx-auto mb-4 text-muted-foreground" />
                  <h2 className="text-2xl font-semibold mb-2">Your cart is empty</h2>
                  <p className="text-muted-foreground mb-6">Add some products to get started!</p>
                  <Button onClick={() => navigate("/shop")} className="bg-neon-green text-primary-foreground hover:bg-neon-green/90">
                    Continue Shopping
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {items.map((item) => (
                  <Card key={item.product.id} className="hover:shadow-glow-primary transition-all duration-300">
                    <CardContent className="p-4">
                      <div className="relative aspect-square mb-4 bg-secondary rounded-lg overflow-hidden">
                        <img 
                          src={item.product.image_url || "/placeholder.svg"} 
                          alt={item.product.name}
                          className="w-full h-full object-cover"
                          onError={(e) => { e.currentTarget.src = "/placeholder.svg"; e.currentTarget.onerror = null; }}
                        />
                        
                        {/* Badges */}
                        <div className="absolute top-2 left-2 flex flex-col gap-2">
                          {item.product.original_price && item.product.original_price > item.product.price && (
                            <Badge className="bg-neon-pink text-primary-foreground">
                              {Math.round((1 - item.product.price / item.product.original_price) * 100)}% OFF
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h3 className="font-semibold text-foreground text-lg">
                          {item.product.name}
                        </h3>
                        
                        {/* Size and Color */}
                        {(item.product.selectedSize || item.product.selectedColor) && (
                          <div className="flex gap-2 text-sm">
                            {item.product.selectedSize && (
                              <Badge variant="outline">Size: {item.product.selectedSize}</Badge>
                            )}
                            {item.product.selectedColor && (
                              <Badge variant="outline">Color: {item.product.selectedColor}</Badge>
                            )}
                          </div>
                        )}
                        
                        {/* Rating */}
                        <div className="flex items-center gap-1">
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`h-4 w-4 ${
                                  star <= Math.round(item.product.rating)
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-xs text-muted-foreground">({(item.product as any).review_count || 0})</span>
                        </div>

                        {/* Price */}
                        <div className="flex items-center gap-2">
                          <span className="text-xl font-bold text-foreground">₹{item.product.price * item.quantity}</span>
                          {item.product.original_price && (
                            <span className="text-sm text-muted-foreground line-through">
                              ₹{item.product.original_price * item.quantity}
                            </span>
                          )}
                        </div>

                        {/* Quantity Controls */}
                        <div className="flex items-center gap-3 pt-2">
                          <span className="text-sm text-muted-foreground">Quantity:</span>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                            >
                              -
                            </Button>
                            <span className="w-8 text-center font-semibold">{item.quantity}</span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                            >
                              +
                            </Button>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2 pt-2">
                          <Button 
                            variant="outline" 
                            className="flex-1"
                            onClick={() => removeFromCart(item.product.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Remove
                          </Button>
                          <Button 
                            className="flex-1 bg-neon-green text-primary-foreground hover:bg-neon-green/90"
                            onClick={() => handleBuyProduct(item.product.id, item.product.name, item.product.price, item.quantity, item.product.selectedSize, item.product.selectedColor, item.product.image_url)}
                          >
                            Buy Now
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="wishlist">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-2">My Wishlist</h1>
              <p className="text-muted-foreground">
                {favorites.length === 0 ? "Your wishlist is empty" : `You have ${favorites.length} item${favorites.length !== 1 ? 's' : ''} in your wishlist`}
              </p>
            </div>

            {favorites.length === 0 ? (
              <Card className="p-12 text-center">
                <CardContent>
                  <Heart className="h-24 w-24 mx-auto mb-4 text-muted-foreground" />
                  <h2 className="text-2xl font-semibold mb-2">Your wishlist is empty</h2>
                  <p className="text-muted-foreground mb-6">Click the heart icon on products to add them here!</p>
                  <Button onClick={() => navigate("/shop")} className="bg-neon-pink text-primary-foreground hover:bg-neon-pink/90">
                    Browse Products
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {favorites.map((product) => (
                  <Card key={product.id} className="hover:shadow-glow-primary transition-all duration-300">
                    <CardContent className="p-4">
                      <div className="relative aspect-square mb-4 bg-secondary rounded-lg overflow-hidden">
                        <img 
                          src={product.image_url || "/placeholder.svg"} 
                          alt={product.name}
                          className="w-full h-full object-cover"
                          onError={(e) => { e.currentTarget.src = "/placeholder.svg"; e.currentTarget.onerror = null; }}
                        />
                        
                        {/* Badges */}
                        <div className="absolute top-2 left-2 flex flex-col gap-2">
                          {product.original_price && product.original_price > product.price && (
                            <Badge className="bg-neon-pink text-primary-foreground">
                              {Math.round((1 - product.price / product.original_price) * 100)}% OFF
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h3 className="font-semibold text-foreground text-lg">
                          {product.name}
                        </h3>
                        
                        {/* Rating */}
                        <div className="flex items-center gap-1">
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`h-4 w-4 ${
                                  star <= Math.round(product.rating)
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                        </div>

                        {/* Price */}
                        <div className="flex items-center gap-2">
                          <span className="text-xl font-bold text-foreground">₹{product.price}</span>
                          {product.original_price && (
                            <span className="text-sm text-muted-foreground line-through">
                              ₹{product.original_price}
                            </span>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2 pt-2">
                          <Button 
                            variant="outline" 
                            className="flex-1"
                            onClick={() => removeFromFavorites(product.id)}
                          >
                            <Heart className="h-4 w-4 mr-2 fill-current text-neon-pink" />
                            Remove
                          </Button>
                          <Button 
                            className="flex-1 bg-neon-green text-primary-foreground hover:bg-neon-green/90"
                            onClick={() => handleAddFavoriteToCart(product)}
                          >
                            <ShoppingCart className="h-4 w-4 mr-2" />
                            Add to Cart
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="alerts">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-2">Price Alerts</h1>
              <p className="text-muted-foreground">
                {priceAlertsList.length === 0 ? "You haven't set any price alerts" : `You have ${priceAlertsList.length} active price alert${priceAlertsList.length !== 1 ? 's' : ''}`}
              </p>
            </div>

            {priceAlertsList.length === 0 ? (
              <Card className="p-12 text-center">
                <CardContent>
                  <Bell className="h-24 w-24 mx-auto mb-4 text-muted-foreground" />
                  <h2 className="text-2xl font-semibold mb-2">No price alerts</h2>
                  <p className="text-muted-foreground mb-6">Set price alerts on products you're interested in.</p>
                  <Button onClick={() => navigate("/shop")} className="bg-neon-green text-primary-foreground hover:bg-neon-green/90">
                    Browse Products
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {priceAlertsList.map((alert) => (
                  <Card key={alert.id} className="hover:shadow-glow-primary transition-all duration-300">
                    <CardContent className="p-4">
                      <div className="relative aspect-square mb-4 bg-secondary rounded-lg overflow-hidden">
                        <img 
                          src={alert.product?.image_url || "/placeholder.svg"} 
                          alt={alert.product?.name || "Product"}
                          className="w-full h-full object-cover"
                          onError={(e) => { e.currentTarget.src = "/placeholder.svg"; e.currentTarget.onerror = null; }}
                        />
                        {!alert.is_active && (
                           <Badge className="absolute top-2 left-2 bg-green-500 text-white">Alert Triggered!</Badge>
                        )}
                      </div>

                      <div className="space-y-3">
                        <h3 className="font-semibold text-foreground text-lg line-clamp-2">
                          {alert.product?.name}
                        </h3>

                        <div className="flex flex-col gap-1">
                           <div className="flex justify-between items-center text-sm">
                              <span className="text-muted-foreground">Current Price:</span>
                              <span className="font-bold">₹{alert.product?.price}</span>
                           </div>
                           <div className="flex justify-between items-center text-sm border-t pt-1">
                              <span className="text-muted-foreground">Target Price:</span>
                              <span className="font-bold text-neon-pink">₹{alert.target_price}</span>
                           </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                          <Button 
                            variant="outline" 
                            className="w-full"
                            onClick={() => removePriceAlert(alert.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Remove Alert
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {checkoutProduct && (
        <CheckoutDialog
          open={!!checkoutProduct}
          onOpenChange={(open) => !open && setCheckoutProduct(null)}
          productId={checkoutProduct.id}
          productName={checkoutProduct.name}
          productPrice={checkoutProduct.price * checkoutProduct.quantity}
          quantity={checkoutProduct.quantity}
          size={checkoutProduct.size}
          color={checkoutProduct.color}
          imageUrl={checkoutProduct.imageUrl}
          onOrderSuccess={() => handleOrderSuccess(checkoutProduct.id)}
        />
      )}
    </div>
  );
};
