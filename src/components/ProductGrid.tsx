import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Star, ShoppingCart, Heart, TrendingUp, TrendingDown, Minus, ArrowUp, ArrowDown, MoveHorizontal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";

interface Product {
  id: string;
  name: string;
  price: number;
  original_price?: number;
  image_url: string;
  image_urls?: string[];
  rating: number;
  review_count?: number;
  category: string;
  gender: string;
  stock: number;
  created_at: string;
  sold_count?: number;
}

interface ProductGridProps {
  searchQuery: string;
  selectedCategory: string;
  onAddToCart: (product: Product) => void;
}

export const ProductGrid = ({ searchQuery, selectedCategory, onAddToCart }: ProductGridProps) => {
  const navigate = useNavigate();
  const { addToFavorites, removeFromFavorites, isFavorite } = useCart();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredProduct, setHoveredProduct] = useState<string | null>(null);
  const [hoveredImageIndex, setHoveredImageIndex] = useState<{ [key: string]: number }>({});
  
  const [priceHistories, setPriceHistories] = useState<{[key: string]: any[]}>({});
  const [selectedHistory, setSelectedHistory] = useState<any[]>([]);
  const [selectedProductForHistory, setSelectedProductForHistory] = useState<Product | null>(null);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [targetPrice, setTargetPrice] = useState("");
  const [settingAlert, setSettingAlert] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [timeRange, setTimeRange] = useState<'1M' | '3M' | '6M'>('6M');
  
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUser(user);
    });
  }, []);

  const handleSetAlert = async () => {
    if (!currentUser) {
      toast({ title: "Please login to set a price alert", variant: "destructive" });
      return;
    }
    const price = parseInt(targetPrice);
    if (!selectedProductForHistory || isNaN(price) || price <= 0 || price >= selectedProductForHistory.price) {
      toast({ title: "Invalid Price", description: "Target price must be lower than the current price.", variant: "destructive" });
      return;
    }
    
    setSettingAlert(true);
    try {
      const { error } = await supabase.from("price_alerts").insert({
        user_id: currentUser.id,
        product_id: selectedProductForHistory.id,
        target_price: price,
        is_active: true
      });
      if (error) throw error;
      toast({ title: "Alert Set!", description: `We'll notify you when the price drops to ₹${price} or lower.` });
      setTargetPrice("");
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to set price alert", variant: "destructive" });
    } finally {
      setSettingAlert(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [selectedCategory, searchQuery]);

  const fetchPriceHistory = async (productId: string) => {
    try {
      const { data, error } = await supabase
        .from('price_history')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: true });

      if (error) {
        if (error.code !== '42P01') {
          console.error(`Error fetching price history for ${productId}:`, error);
        }
        return;
      }

      if (data && data.length > 0) {
        const formattedData = data.map(item => ({
          date: new Date(item.created_at).toLocaleDateString(),
          price: item.price,
          timestamp: new Date(item.created_at).getTime()
        }));
        setPriceHistories(prev => ({ ...prev, [productId]: formattedData }));
      }
    } catch (e) {
      console.error(`Error in fetchPriceHistory for ${productId}:`, e);
    }
  };

  const fetchAllHistories = async (products: Product[]) => {
    const promises = products.map(p => fetchPriceHistory(p.id));
    await Promise.all(promises);
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      const finalProducts = data || [];
      setProducts(finalProducts);
      fetchAllHistories(finalProducts);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || 
                           selectedCategory === product.category || 
                           selectedCategory === product.gender;
    return matchesSearch && matchesCategory;
  });

  const toggleFavorite = (product: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isFavorite(product.id)) {
      removeFromFavorites(product.id);
      toast({
        title: "Removed from Wishlist",
        description: `${product.name} removed from your wishlist`
      });
    } else {
      addToFavorites(product);
      toast({
        title: "Added to Wishlist",
        description: `${product.name} added to your wishlist`
      });
    }
  };

  const handleAddToCart = (product: Product) => {
    if (product.stock > 0) {
      onAddToCart(product);
    }
  };

  const getProductImages = (product: Product): string[] => {
    const images: string[] = [];
    if (product.image_urls && product.image_urls.length > 0) {
      images.push(...product.image_urls.slice(0, 4));
    }
    if (product.image_url && !images.includes(product.image_url)) {
      images.unshift(product.image_url);
    }
    return images.length > 0 ? images.slice(0, 4) : ["/placeholder.svg"];
  };

  const handleImageHover = (productId: string, index: number) => {
    setHoveredImageIndex(prev => ({ ...prev, [productId]: index }));
  };

  const renderPriceTrend = (product: Product) => {
    const history = priceHistories[product.id];
    let safeHistory = history && history.length > 0 ? [...history] : [];
    
    if (safeHistory.length > 0) {
      const lastPoint = safeHistory[safeHistory.length - 1];
      if (lastPoint.price !== product.price || safeHistory.length === 1) {
        safeHistory.push({ date: 'Current', price: product.price, timestamp: Date.now() });
      }
    } else {
      safeHistory = [
        { date: 'Initial', price: product.price, timestamp: Date.now() - 24*60*60*1000 },
        { date: 'Current', price: product.price, timestamp: Date.now() }
      ];
    }
    
    const avgPrice = safeHistory.reduce((sum, h) => sum + h.price, 0) / safeHistory.length;
    const currentPrice = product.price;
    
    let icon = <Minus className="h-4 w-4 text-gray-400" />;
    if (currentPrice > avgPrice) {
      icon = <TrendingUp className="h-4 w-4 text-red-500" />;
    } else if (currentPrice < avgPrice) {
      icon = <TrendingDown className="h-4 w-4 text-green-500" />;
    }
    
    return (
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-12 bg-card/80 backdrop-blur-sm hover:bg-card z-10"
        onClick={(e) => {
          e.stopPropagation();
          setSelectedProductForHistory(product);
          setSelectedHistory(safeHistory);
          setHistoryModalOpen(true);
        }}
      >
        {icon}
      </Button>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <p className="text-muted-foreground">Loading products...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-foreground">
          {searchQuery ? `Search Results for "${searchQuery}"` : "Featured Products"}
        </h2>
        <p className="text-muted-foreground">
          {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''} found
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {filteredProducts.map(product => {
          const productImages = getProductImages(product);
          const currentImageIndex = hoveredImageIndex[product.id] || 0;
          
          return (
            <Card 
              key={product.id} 
              className="group hover:shadow-glow-primary transition-all duration-300 bg-card border-border cursor-pointer"
              onClick={() => navigate(`/product/${product.id}`)}
              onMouseEnter={() => setHoveredProduct(product.id)}
              onMouseLeave={() => {
                setHoveredProduct(null);
                setHoveredImageIndex(prev => ({ ...prev, [product.id]: 0 }));
              }}
            >
              <CardContent className="p-4">
                <div className="relative aspect-square mb-4 bg-secondary rounded-lg overflow-hidden">
                  <img 
                    src={productImages[currentImageIndex] || "/placeholder.svg"} 
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.onerror = null;
                      target.src = "/placeholder.svg";
                    }}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                  
                  {productImages.length > 1 && (
                    <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1">
                      {productImages.map((_, idx) => (
                        <button
                          key={idx}
                          className={`w-2 h-2 rounded-full transition-all ${
                            idx === currentImageIndex ? 'bg-primary w-4' : 'bg-white/60'
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleImageHover(product.id, idx);
                          }}
                        />
                      ))}
                    </div>
                  )}
                  
                  <div className="absolute top-2 left-2 flex flex-col gap-2">
                    {new Date(product.created_at).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000 && (
                      <Badge className="bg-neon-green text-primary-foreground">NEW</Badge>
                    )}
                    {product.original_price && product.original_price > product.price && (
                      <Badge className="bg-neon-pink text-primary-foreground">
                        {Math.round((1 - product.price / product.original_price) * 100)}% OFF
                      </Badge>
                    )}
                    {product.stock === 0 && (
                      <Badge variant="destructive">Out of Stock</Badge>
                    )}
                  </div>

                  {renderPriceTrend(product)}

                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 bg-card/80 backdrop-blur-sm hover:bg-card"
                    onClick={(e) => toggleFavorite(product, e)}
                  >
                    <Heart 
                      className={`h-4 w-4 ${isFavorite(product.id) 
                        ? 'text-neon-pink fill-current' 
                        : 'text-muted-foreground'
                      }`} 
                    />
                  </Button>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                    {product.name}
                  </h3>
                  
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
                    <span className="text-xs text-muted-foreground">({product.review_count || 0})</span>
                    <span className="text-xs text-muted-foreground ml-1">sold:{product.sold_count || 0}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-foreground">₹{product.price}</span>
                    {product.original_price && (
                      <span className="text-sm text-muted-foreground line-through">
                        ₹{product.original_price}
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>

              <CardFooter className="p-4 pt-0">
                <Button 
                  className="w-full"
                  variant={product.stock > 0 ? "neon" : "ghost"}
                  disabled={product.stock === 0}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddToCart(product);
                  }}
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  {product.stock > 0 ? "Add to Cart" : "Out of Stock"}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <div className="text-muted-foreground text-lg mb-4">
            No products found matching your criteria
          </div>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Clear Filters
          </Button>
        </div>
      )}

      {(() => {
        const getFilteredHistory = () => {
          if (!selectedHistory || selectedHistory.length === 0) return [];
          
          const now = Date.now();
          const months = timeRange === '1M' ? 1 : timeRange === '3M' ? 3 : 6;
          const cutoff = now - (months * 30 * 24 * 60 * 60 * 1000);
          
          let filtered = selectedHistory.filter(h => (h.timestamp || 0) >= cutoff);
          
          const olderPoints = selectedHistory.filter(h => (h.timestamp || 0) < cutoff);
          if (olderPoints.length > 0) {
            const lastOlderPrice = olderPoints[olderPoints.length - 1].price;
            filtered = [{ date: new Date(cutoff).toLocaleDateString(), price: lastOlderPrice, timestamp: cutoff }, ...filtered];
          }
          
          if (filtered.length === 1) {
            filtered = [{ date: new Date(cutoff).toLocaleDateString(), price: filtered[0].price, timestamp: cutoff }, ...filtered];
          }
          
          return filtered;
        };
        const activeHistory = getFilteredHistory();

        let recommendationColor = "#eab308";
        let recommendationText = "Decent Value";
        let recommendationSub = "Price is stable";
        let rotation = "0deg";
        
        if (activeHistory.length > 0) {
          const currentPrice = activeHistory[activeHistory.length - 1].price;
          const avgPrice = activeHistory.reduce((sum, h) => sum + h.price, 0) / activeHistory.length;
          
          if (currentPrice < avgPrice * 0.95) {
            recommendationColor = "#22c55e";
            recommendationText = "Great Time to Buy!";
            recommendationSub = "Price has dropped";
            rotation = "60deg";
          } else if (currentPrice > avgPrice * 1.05) {
            recommendationColor = "#ef4444";
            recommendationText = "Wait for Better Value";
            recommendationSub = "Price is currently high";
            rotation = "-60deg";
          }
        }

        return (
          <Dialog open={historyModalOpen} onOpenChange={setHistoryModalOpen}>
            <DialogContent className="sm:max-w-[800px] bg-white text-black p-6 overflow-hidden border-0 rounded-2xl">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-2xl font-bold">Price history</h2>
                <div className="flex bg-[#f1f3f6] rounded-full p-1 text-sm text-gray-500 font-medium">
                  <div className={`px-5 py-1 rounded-full cursor-pointer transition-all ${timeRange === '1M' ? 'bg-white text-[#4f46e5] shadow-sm' : 'hover:bg-white hover:shadow-sm'}`} onClick={() => setTimeRange('1M')}>1M</div>
                  <div className={`px-5 py-1 rounded-full cursor-pointer transition-all ${timeRange === '3M' ? 'bg-white text-[#4f46e5] shadow-sm' : 'hover:bg-white hover:shadow-sm'}`} onClick={() => setTimeRange('3M')}>3M</div>
                  <div className={`px-5 py-1 rounded-full cursor-pointer transition-all ${timeRange === '6M' ? 'bg-white text-[#4f46e5] shadow-sm' : 'hover:bg-white hover:shadow-sm'}`} onClick={() => setTimeRange('6M')}>6M</div>
                </div>
              </div>
              
              <div className="pb-2">
                {activeHistory && activeHistory.length > 0 ? (
                  <div className="space-y-4">
                    {activeHistory[activeHistory.length - 1]?.price <= Math.min(...activeHistory.map(h => h.price)) ? (
                      <div className="flex items-center gap-2 text-black text-sm font-medium mb-6">
                        <ArrowDown className="h-5 w-5 bg-green-500 text-white rounded-full p-1" /> Price at its lowest!
                      </div>
                    ) : activeHistory[activeHistory.length - 1]?.price >= Math.max(...activeHistory.map(h => h.price)) ? (
                      <div className="flex items-center gap-2 text-black text-sm font-medium mb-6">
                        <ArrowUp className="h-5 w-5 bg-red-500 text-white rounded-full p-1" /> Price at its peak!
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-black text-sm font-medium mb-6">
                        <MoveHorizontal className="h-5 w-5 bg-blue-500 text-white rounded-full p-1" /> Price is stable.
                      </div>
                    )}
                    
                    <div className="h-[220px] w-full mt-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={activeHistory} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4}/>
                              <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <XAxis 
                            dataKey="date" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 12, fill: '#000', fontWeight: 500 }} 
                            dy={10}
                          />
                          <YAxis 
                            orientation="right"
                            domain={['auto', 'auto']} 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 12, fill: '#000', fontWeight: 500 }}
                            tickFormatter={(value) => `₹${value}`}
                          />
                          <Tooltip 
                            formatter={(value) => [`₹${value}`, 'Price']}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontWeight: 'bold', color: '#000' }}
                            itemStyle={{ color: '#000' }}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="price" 
                            stroke="#ef4444" 
                            strokeWidth={2}
                            fillOpacity={1} 
                            fill="url(#colorPrice)" 
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    
                    <h3 className="font-bold text-xl mt-6 mb-2">Price history</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-[#f4f6f8] p-4 rounded-xl text-center">
                        <div className="text-xs text-gray-500 flex items-center justify-center gap-1 mb-1">
                          Highest Price <ArrowUp className="h-3 w-3 text-red-500" />
                        </div>
                        <div className="font-bold text-xl">₹{Math.max(...activeHistory.map(h => h.price))}</div>
                      </div>
                      <div className="bg-[#f4f6f8] p-4 rounded-xl text-center">
                        <div className="text-xs text-gray-500 flex items-center justify-center gap-1 mb-1">
                          Average Price <MoveHorizontal className="h-3 w-3 text-yellow-500" />
                        </div>
                        <div className="font-bold text-xl">
                          ₹{Math.round(activeHistory.reduce((sum, h) => sum + h.price, 0) / activeHistory.length)}
                        </div>
                      </div>
                      <div className="bg-[#f4f6f8] p-4 rounded-xl text-center">
                        <div className="text-xs text-gray-500 flex items-center justify-center gap-1 mb-1">
                          Lowest Price <ArrowDown className="h-3 w-3 text-green-500" />
                        </div>
                        <div className="font-bold text-xl">₹{Math.min(...activeHistory.map(h => h.price))}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-8 mt-6 pt-4 border-t border-gray-100">
                      <div>
                        <h3 className="font-bold text-lg mb-4">Should you buy this now?</h3>
                        <div className="flex items-center gap-6">
                          <div className="relative w-28 h-14 overflow-hidden">
                            <div className="absolute w-28 h-28 rounded-full border-[10px] border-[#ef4444] border-t-[#eab308] border-r-[#22c55e]"></div>
                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-10 bg-[#3730a3] origin-bottom rounded-full" style={{ transform: `translateX(-50%) rotate(${rotation})`, transition: 'transform 0.5s ease-out' }}></div>
                            <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-3 h-3 bg-[#3730a3] rounded-full"></div>
                            <div className="absolute bottom-0 left-0 text-[10px] text-red-500 font-bold ml-1">0</div>
                            <div className="absolute bottom-0 right-0 text-[10px] text-green-500 font-bold mr-1">100</div>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500 mb-1">Our Recommendation</p>
                            <p style={{ color: recommendationColor }} className="font-bold text-lg">{recommendationText}</p>
                            <p className="text-xs text-gray-500">{recommendationSub}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="font-bold text-lg mb-4">Set price drop alert to buy later</h3>
                        <div className="flex gap-2 p-2 bg-[#f4f6f8] rounded-xl border border-gray-200">
                          <div className="flex-1 flex items-center pl-3">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 mr-2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                            <input 
                              type="number"
                              placeholder="Target Price (₹)"
                              className="bg-transparent border-none outline-none font-bold w-full"
                              value={targetPrice}
                              onChange={e => setTargetPrice(e.target.value)}
                            />
                          </div>
                          <Button 
                            onClick={handleSetAlert}
                            disabled={settingAlert || !targetPrice}
                            className="bg-[#4f46e5] hover:bg-[#4338ca] text-white rounded-lg px-6 font-semibold"
                          >
                            {settingAlert ? "Setting..." : "Set price alert"}
                          </Button>
                        </div>
                      </div>
                    </div>

                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                    No history available
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        );
      })()}
    </div>
  );
};