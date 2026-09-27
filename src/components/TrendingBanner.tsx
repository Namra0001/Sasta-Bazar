import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const TrendingBanner = () => {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [trendingProducts, setTrendingProducts] = useState<any[]>([]);

  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    fetchTrendingProducts();
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchTrendingProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .not("original_price", "is", null)
        .order("created_at", { ascending: false })
        .limit(20); // Fetch more to filter locally

      if (!error && data) {
        const validProducts = data.map(product => {
          // Only show products that actually have a discounted price
          if (!product.original_price || product.original_price <= product.price) {
            return null;
          }
          
          let isExpired = false;
          if (Array.isArray(product.tags)) {
             const expiryTag = product.tags.find((t: string) => t.startsWith("offer_expires_at:"));
             if (expiryTag) {
                const expiryDate = new Date(expiryTag.split("offer_expires_at:")[1]);
                if (expiryDate.getTime() < Date.now()) {
                   isExpired = true;
                }
             }
          }
          if (isExpired) {
             supabase.from('products').update({
                price: product.original_price,
                original_price: null,
                tags: product.tags.filter((t: string) => !t.startsWith("offer_expires_at:"))
             }).eq("id", product.id).then(() => {});
             return null;
          }
          return product;
        }).filter(Boolean);
        setTrendingProducts(validProducts as any[]);
      }
    } catch (err) {
      console.error("Failed to fetch trending products:", err);
    }
  };

  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    let animationId: number;
    let scrollPos = 0;

    const scroll = () => {
      scrollPos += 1;
      if (scrollPos >= scrollContainer.scrollWidth - scrollContainer.clientWidth) {
        scrollPos = 0; 
      }
      scrollContainer.scrollLeft = scrollPos;
      animationId = requestAnimationFrame(scroll);
    };

    animationId = requestAnimationFrame(scroll);

    const handleMouseEnter = () => cancelAnimationFrame(animationId);
    const handleMouseLeave = () => {
      animationId = requestAnimationFrame(scroll);
    };

    scrollContainer.addEventListener("mouseenter", handleMouseEnter);
    scrollContainer.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      cancelAnimationFrame(animationId);
      if (scrollContainer) {
        scrollContainer.removeEventListener("mouseenter", handleMouseEnter);
        scrollContainer.removeEventListener("mouseleave", handleMouseLeave);
      }
    };
  }, [trendingProducts]);

  const calculateDiscount = (price: number, original: number) => {
    if (!original) return 0;
    return Math.round((1 - price / original) * 100);
  };

  const getExpiryTime = (tags: any[]) => {
    if (!Array.isArray(tags)) return null;
    const tag = tags.find(t => typeof t === 'string' && t.startsWith("offer_expires_at:"));
    return tag ? new Date(tag.split("offer_expires_at:")[1]).getTime() : null;
  };

  const getTimeComponents = (expiryTime: number) => {
    const diff = expiryTime - now;
    if (diff <= 0) return { h: "00", m: "00", s: "00" };
    
    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((diff % (1000 * 60)) / 1000);
    
    return {
      h: h.toString().padStart(2, '0'),
      m: m.toString().padStart(2, '0'),
      s: s.toString().padStart(2, '0')
    };
  };

  // Filter out any that expired while viewing
  const activeProducts = trendingProducts.filter(p => {
    const expiry = getExpiryTime(p.tags);
    return !expiry || expiry > now;
  });

  return (
    <div className="w-full py-6 mb-8 overflow-hidden bg-slate-50 dark:bg-slate-900 border-y border-border">
      <div className="container mx-auto px-4 mb-4">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Trending & Offers</h2>
      </div>

      <div
        ref={scrollRef}
        className="flex space-x-6 overflow-x-auto pb-4 px-4 scrollbar-hide container mx-auto"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >


        {activeProducts.map((product) => {
          const expiryTime = getExpiryTime(product.tags);
          return (
          <div key={product.id} className="flex-none w-80">
            <Card 
              className="h-48 bg-card cursor-pointer group shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-row border-border"
              onClick={() => navigate(`/product/${product.id}`)}
            >
              <div className="w-2/5 h-full relative overflow-hidden">
                <img 
                  src={product.image_url || "/placeholder.svg"} 
                  alt={product.name} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                  onError={(e) => { e.currentTarget.src = "/placeholder.svg"; e.currentTarget.onerror = null; }} 
                />
                <Badge className="absolute top-2 left-2 bg-red-500 text-white text-[10px] px-1">Top Seller</Badge>
              </div>
              <CardContent className="w-3/5 p-4 flex flex-col justify-between">
                <div>
                  <h3 className="font-semibold text-foreground line-clamp-2 text-sm">{product.name}</h3>
                  <div className="mt-2 flex flex-col">
                    <span className="text-lg font-bold text-orange-600 dark:text-orange-400">₹{product.price}</span>
                    {product.original_price && (
                      <div className="flex flex-col gap-1 mt-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground line-through">₹{product.original_price}</span>
                          <span className="text-[10px] font-bold text-green-700 bg-green-100 px-1 rounded">
                            {calculateDiscount(product.price, product.original_price)}% OFF
                          </span>
                        </div>
                        {expiryTime && (() => {
                          const time = getTimeComponents(expiryTime);
                          return (
                            <div className="flex items-center gap-1 mt-1">
                              <div className="flex flex-col items-center">
                                <span className="text-[8px] text-blue-400 mb-[2px]">Hours</span>
                                <div className="bg-white dark:bg-slate-800 rounded shadow-sm border border-slate-100 dark:border-slate-700 p-1 w-8 text-center font-bold text-slate-700 dark:text-slate-200 text-xs">
                                  {time.h}
                                </div>
                              </div>
                              <div className="flex flex-col items-center justify-end h-full pb-1">
                                <span className="text-blue-300 font-bold">:</span>
                              </div>
                              <div className="flex flex-col items-center">
                                <span className="text-[8px] text-blue-400 mb-[2px]">Minutes</span>
                                <div className="bg-white dark:bg-slate-800 rounded shadow-sm border border-slate-100 dark:border-slate-700 p-1 w-8 text-center font-bold text-slate-700 dark:text-slate-200 text-xs">
                                  {time.m}
                                </div>
                              </div>
                              <div className="flex flex-col items-center justify-end h-full pb-1">
                                <span className="text-blue-300 font-bold">:</span>
                              </div>
                              <div className="flex flex-col items-center">
                                <span className="text-[8px] text-blue-400 mb-[2px]">Seconds</span>
                                <div className="bg-white dark:bg-slate-800 rounded shadow-sm border border-slate-100 dark:border-slate-700 p-1 w-8 text-center font-bold text-slate-700 dark:text-slate-200 text-xs">
                                  {time.s}
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                </div>
                <Button size="sm" className="w-full mt-2">
                  Shop Now
                </Button>
              </CardContent>
            </Card>
          </div>
        )})}
      </div>
    </div>
  );
};
