import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { useCart } from "@/contexts/CartContext";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, TrendingUp, Flame, ShoppingCart } from "lucide-react";

interface TrendsProps {
  onLogout: () => void;
}

interface Product {
  id: string;
  name: string;
  price: number;
  original_price: number | null;
  image_url: string | null;
  category: string;
  rating: number | null;
  review_count: number | null;
  sold_count: number | null;
  stock: number | null;
}

export const Trends = ({ onLogout }: TrendsProps) => {
  const { cartCount, addToCart } = useCart();
  const navigate = useNavigate();

  const { data: trendingProducts, isLoading } = useQuery({
    queryKey: ["trending-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .order("sold_count", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data as Product[];
    },
  });

  const handleCartClick = () => {
    navigate("/cart");
  };

  const handleProductClick = (productId: string) => {
    navigate(`/product/${productId}`);
  };

  const handleAddToCart = (product: Product) => {
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      original_price: product.original_price || undefined,
      image_url: product.image_url || "",
      category: product.category,
      rating: product.rating || 0,
      gender: "",
      stock: product.stock || 0,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar
        cartCount={cartCount}
        onCartClick={handleCartClick}
        onLogout={onLogout}
      />

      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">
              Trending Products
            </h1>
            <Flame className="h-6 w-6 text-destructive animate-pulse" />
          </div>
          <p className="text-muted-foreground">
            Most popular products loved by our customers
          </p>
        </div>

        {/* Products Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="aspect-square bg-muted rounded-lg mb-4" />
                  <div className="h-4 bg-muted rounded mb-2" />
                  <div className="h-4 bg-muted rounded w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : trendingProducts && trendingProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {trendingProducts.map((product, index) => (
              <Card
                key={product.id}
                className="group overflow-hidden border-border hover:border-primary/50 transition-all duration-300 cursor-pointer hover:shadow-lg"
                onClick={() => handleProductClick(product.id)}
              >
                <CardContent className="p-0">
                  {/* Image */}
                  <div className="relative aspect-square bg-secondary overflow-hidden">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingCart className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}

                    {/* Rank Badge */}
                    <Badge
                      className={`absolute top-2 left-2 ${
                        index === 0
                          ? "bg-yellow-500"
                          : index === 1
                          ? "bg-gray-400"
                          : index === 2
                          ? "bg-amber-600"
                          : "bg-primary"
                      }`}
                    >
                      #{index + 1}
                    </Badge>

                    {/* Sold Count Badge */}
                    <Badge
                      variant="secondary"
                      className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm"
                    >
                      <Flame className="h-3 w-3 mr-1 text-destructive" />
                      {product.sold_count || 0} sold
                    </Badge>
                  </div>

                  {/* Content */}
                  <div className="p-4 space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">
                        {product.category}
                      </p>
                      <h3 className="font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                        {product.name}
                      </h3>
                    </div>

                    {/* Rating */}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center">
                        <Star className="h-4 w-4 text-yellow-500 fill-current" />
                        <span className="text-sm ml-1">
                          {product.rating?.toFixed(1) || "0.0"}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        ({product.review_count || 0} reviews)
                      </span>
                    </div>

                    {/* Price */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-primary">
                          ₹{product.price}
                        </span>
                        {product.original_price && (
                          <span className="text-sm text-muted-foreground line-through">
                            ₹{product.original_price}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-neon-green">
                        stock: {product.stock || 0}
                      </span>
                    </div>

                    {/* Add to Cart */}
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddToCart(product);
                      }}
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Add to Cart
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <TrendingUp className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">
              No trending products yet
            </h3>
            <p className="text-muted-foreground mb-6">
              Check back soon for popular items
            </p>
            <Button onClick={() => navigate("/shop")}>Browse All Products</Button>
          </div>
        )}
      </main>
    </div>
  );
};
