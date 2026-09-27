import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ShoppingCart, Star, Package, Truck, Shield, Play, MessageSquare, Bell } from "lucide-react";
import { Navbar } from "@/components/Navbar";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  original_price?: number;
  category: string;
  gender: string;
  brand: string;
  sizes: string[];
  colors: string[];
  stock: number;
  image_url: string;
  image_urls?: string[];
  rating: number;
  review_count: number;
  sold_count: number;
  is_active: boolean;
  product_code?: string;
  seller_id?: string;
}

interface Review {
  id: string;
  user_id: string;
  rating: number;
  review_text: string | null;
  photo_url: string | null;
  video_url: string | null;
  created_at: string;
}

interface ProductDetailsProps {
  onLogout: () => void;
}

export const ProductDetails = ({ onLogout }: ProductDetailsProps) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<any[]>([]);
  const [newQuestion, setNewQuestion] = useState("");
  const [isSubmittingQuestion, setIsSubmittingQuestion] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const { addToCart, cartCount } = useCart();
  const [activeImage, setActiveImage] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{code: string, discount: number} | null>(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [targetPrice, setTargetPrice] = useState("");
  const [settingAlert, setSettingAlert] = useState(false);
  const { toast } = useToast();

  const handleSetAlert = async () => {
    if (!currentUser) {
      toast({ title: "Please login to set a price alert", variant: "destructive" });
      return;
    }
    const price = parseInt(targetPrice);
    if (!product || isNaN(price) || price <= 0 || price >= product.price) {
      toast({ title: "Invalid Price", description: "Target price must be lower than the current price.", variant: "destructive" });
      return;
    }
    
    setSettingAlert(true);
    try {
      const { error } = await supabase.from("price_alerts").insert({
        user_id: currentUser.id,
        product_id: product.id,
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

  const handleApplyCoupon = async () => {
    if (!couponCode || !product) return;
    setApplyingCoupon(true);
    try {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .eq("code", couponCode.toUpperCase())
        .eq("seller_id", product.seller_id)
        .eq("is_active", true)
        .maybeSingle();
        
      if (error || !data) {
        toast({ title: "Invalid Coupon", description: "This coupon is invalid or expired.", variant: "destructive" });
        return;
      }
      
      setAppliedCoupon({ code: data.code, discount: data.discount_amount });
      toast({ title: "Coupon Applied!", description: `₹${data.discount_amount} off applied successfully.` });
    } catch (e) {
      toast({ title: "Error", description: "Failed to apply coupon.", variant: "destructive" });
    } finally {
      setApplyingCoupon(false);
    }
  };

  useEffect(() => {
    fetchProduct();
    fetchReviews();
    fetchQuestions();
    checkUser();
  }, [id]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
  };

  const fetchQuestions = async () => {
    try {
      const { data, error } = await supabase
        .from("product_questions")
        .select(`
          id,
          question,
          answer,
          created_at,
          answered_at,
          buyer_id
        `)
        .eq("product_id", id)
        .order("created_at", { ascending: false });
        
      if (error) throw error;
      
      if (data) {
        const buyerIds = [...new Set(data.map(q => q.buyer_id))];
        let profilesMap: Record<string, string> = {};
        
        if (buyerIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", buyerIds);
            
          if (profiles) {
            profilesMap = Object.fromEntries(profiles.map(p => [p.id, p.full_name]));
          }
        }
        
        setQuestions(data.map(q => ({
          ...q,
          profiles: { full_name: profilesMap[q.buyer_id] || "Customer" }
        })));
      }
    } catch (e) {
      console.error("Error fetching questions:", e);
    }
  };

  const handleSubmitQuestion = async () => {
    if (!currentUser) {
      toast({ title: "Please login to ask a question", variant: "destructive" });
      return;
    }
    if (!newQuestion.trim()) return;
    
    setIsSubmittingQuestion(true);
    try {
      const { error } = await supabase
        .from("product_questions")
        .insert({
          product_id: product?.id,
          seller_id: product?.seller_id,
          buyer_id: currentUser.id,
          question: newQuestion.trim()
        });
      
      if (error) throw error;
      toast({ title: "Success", description: "Your question has been submitted to the seller." });
      setNewQuestion("");
      fetchQuestions();
    } catch (error: any) {
      toast({ title: "Error", description: "Failed to submit question", variant: "destructive" });
    } finally {
      setIsSubmittingQuestion(false);
    }
  };

  const fetchProduct = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .eq("is_active", true)
        .single();

      if (error) throw error;
      
      let productData = data;
      let isExpired = false;
      if (Array.isArray(productData?.tags)) {
         const expiryTag = productData.tags.find((t: string) => t.startsWith("offer_expires_at:"));
         if (expiryTag) {
            const expiryDate = new Date(expiryTag.split("offer_expires_at:")[1]);
            if (expiryDate.getTime() < Date.now()) {
               isExpired = true;
            }
         }
      }
      
      if (isExpired) {
         supabase.from('products').update({
            price: productData.original_price,
            original_price: null,
            tags: productData.tags.filter((t: string) => !t.startsWith("offer_expires_at:"))
         }).eq("id", productData.id).then(() => {});
         
         productData = {
           ...productData,
           price: productData.original_price,
           original_price: null,
           tags: productData.tags.filter((t: string) => !t.startsWith("offer_expires_at:"))
         };
      }
      
      setProduct(productData);
      setActiveImage(productData.image_url);
      
      if (data?.sizes?.length > 0) setSelectedSize(data.sizes[0]);
      if (data?.colors?.length > 0) setSelectedColor(data.colors[0]);
    } catch (error) {
      console.error("Error fetching product:", error);
      toast({
        title: "Error",
        description: "Failed to load product details",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      const { data, error } = await supabase
        .from("product_reviews")
        .select("*")
        .eq("product_id", id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setReviews(data || []);
    } catch (error) {
      console.error("Error fetching reviews:", error);
    }
  };

  const handleAddToCart = () => {
    if (!product) return;
    
    if (product.stock === 0) {
      toast({
        title: "Out of Stock",
        description: "This product is currently unavailable",
        variant: "destructive"
      });
      return;
    }

    addToCart({
      id: product.id,
      name: product.name,
      price: appliedCoupon ? Math.max(0, product.price - appliedCoupon.discount) : product.price,
      image_url: product.image_url,
      rating: product.rating,
      category: product.category,
      gender: product.gender,
      stock: product.stock,
      original_price: product.original_price,
      selectedSize: selectedSize,
      selectedColor: selectedColor
    });

    toast({
      title: "Added to Cart",
      description: `${product.name}${selectedSize ? ` (Size: ${selectedSize})` : ''}${selectedColor ? ` (Color: ${selectedColor})` : ''} has been added to your cart`
    });
  };

  const handleCartClick = () => {
    navigate("/cart");
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating
                ? "fill-yellow-500 text-yellow-500"
                : "text-muted-foreground"
            }`}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar 
          cartCount={cartCount}
          onSearch={() => {}}
          onCartClick={handleCartClick}
          onLogout={onLogout}
        />
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar 
          cartCount={cartCount}
          onSearch={() => {}}
          onCartClick={handleCartClick}
          onLogout={onLogout}
        />
        <div className="container mx-auto px-4 py-8">
          <Button variant="ghost" onClick={() => navigate("/shop")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Shop
          </Button>
          <p className="text-center text-muted-foreground mt-8">Product not found</p>
        </div>
      </div>
    );
  }

  const discount = product.original_price 
    ? Math.round((1 - product.price / product.original_price) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-background">
      <Navbar 
        cartCount={cartCount}
        onSearch={() => {}}
        onCartClick={handleCartClick}
        onLogout={onLogout}
      />
      
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate("/shop")} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Shop
        </Button>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Product Image */}
          <div className="space-y-4">
            <div className="relative aspect-square rounded-lg overflow-hidden bg-muted group">
              <img 
                src={activeImage || product.image_url || "/placeholder.svg"}
                alt={product.name}
                className="w-full h-full object-cover transition-transform duration-300"
                onError={(e) => { e.currentTarget.src = "/placeholder.svg"; e.currentTarget.onerror = null; }}
              />
              {/* Image indicator dots like shop page */}
              {product.image_urls && product.image_urls.length > 1 && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 z-10">
                  {product.image_urls.map((url, idx) => (
                    <button
                      key={idx}
                      className={`h-2 rounded-full transition-all ${
                        activeImage === url ? 'bg-primary w-6' : 'bg-white/70 w-2 hover:bg-white'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveImage(url);
                      }}
                      onMouseEnter={() => setActiveImage(url)}
                    />
                  ))}
                </div>
              )}
            </div>
            {product.image_urls && product.image_urls.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {product.image_urls.map((url, idx) => (
                  <button 
                    key={idx}
                    onClick={() => setActiveImage(url)}
                    className={`w-20 h-20 flex-shrink-0 rounded-md overflow-hidden border-2 transition-all ${activeImage === url ? 'border-blue-400' : 'border-transparent'}`}
                  >
                    <img src={url} alt={`${product.name} ${idx}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary">{product.category}</Badge>
                {product.gender && <Badge variant="outline">{product.gender}</Badge>}
                {discount > 0 && <Badge className="bg-destructive">{discount}% OFF</Badge>}
              </div>
              <h1 className="text-3xl font-bold text-foreground mb-2">{product.name}</h1>
              {product.product_code && <p className="text-sm font-semibold text-primary mb-1">Code: {product.product_code}</p>}
              {product.brand && <p className="text-muted-foreground">{product.brand}</p>}
            </div>

            {/* Rating */}
            <div className="flex items-center gap-2">
              <div className="flex items-center">
                <Star className="h-5 w-5 fill-yellow-500 text-yellow-500" />
                <span className="ml-1 font-semibold">
                  {reviews.length > 0 
                    ? (reviews.reduce((sum, rev) => sum + rev.rating, 0) / reviews.length).toFixed(1)
                    : product.rating.toFixed(1)}
                </span>
              </div>
              <span className="text-muted-foreground">
                ({reviews.length > 0 ? reviews.length : product.review_count} reviews) | sold:{product.sold_count}
              </span>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-bold text-foreground">
                ₹{appliedCoupon ? Math.max(0, product.price - appliedCoupon.discount) : product.price}
              </span>
              {appliedCoupon && (
                <span className="text-xl text-muted-foreground line-through">
                  ₹{product.price}
                </span>
              )}
              {product.original_price && !appliedCoupon && (
                <span className="text-xl text-muted-foreground line-through">
                  ₹{product.original_price}
                </span>
              )}
            </div>

            {/* Coupon Section */}
            <div className="p-4 border border-border rounded-lg bg-secondary/20">
              <h3 className="font-semibold mb-2">Have a Coupon?</h3>
              <div className="flex gap-2">
                <Input 
                  placeholder="Enter code" 
                  value={couponCode} 
                  onChange={e => setCouponCode(e.target.value)} 
                  disabled={!!appliedCoupon}
                />
                <Button 
                  onClick={appliedCoupon ? () => { setAppliedCoupon(null); setCouponCode(""); } : handleApplyCoupon}
                  variant={appliedCoupon ? "destructive" : "outline"}
                  disabled={applyingCoupon}
                >
                  {appliedCoupon ? "Remove" : "Apply"}
                </Button>
              </div>
            </div>

            {/* Price Alert Section */}
            <div className="p-4 border border-border rounded-lg bg-primary/5">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Bell className="h-4 w-4" /> Set Price Alert
              </h3>
              <p className="text-sm text-muted-foreground mb-3">Get notified when the price drops below your target.</p>
              <div className="flex gap-2">
                <Input 
                  type="number"
                  placeholder="Target Price (₹)" 
                  value={targetPrice} 
                  onChange={e => setTargetPrice(e.target.value)} 
                />
                <Button 
                  onClick={handleSetAlert}
                  disabled={settingAlert || !targetPrice}
                >
                  {settingAlert ? "Setting..." : "Alert Me"}
                </Button>
              </div>
            </div>

            {/* Description */}
            <div>
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-muted-foreground">{product.description}</p>
            </div>

            {/* Size Selection */}
            {product.sizes && product.sizes.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Select Size</h3>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map((size) => (
                    <Button
                      key={size}
                      variant="outline"
                      onClick={() => setSelectedSize(size)}
                      className={`w-12 ${selectedSize === size ? "bg-blue-400 hover:bg-blue-500 text-white border-transparent" : ""}`}
                    >
                      {size}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Color Selection */}
            {product.colors && product.colors.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Select Color</h3>
                <div className="flex flex-wrap gap-2">
                  {product.colors.map((color) => (
                    <Button
                      key={color}
                      variant="outline"
                      onClick={() => setSelectedColor(color)}
                      className={selectedColor === color ? "bg-blue-400 hover:bg-blue-500 text-white border-transparent" : ""}
                    >
                      {color}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Stock Status */}
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              <span className={product.stock > 0 ? "text-green-500 font-medium" : "text-destructive"}>
                {product.stock > 0 ? `stock:${product.stock}` : "Out of stock"}
              </span>
            </div>

            {/* Add to Cart */}
            <Button 
              size="lg" 
              className="w-full bg-blue-400 hover:bg-blue-500 text-white border-none"
              onClick={handleAddToCart}
              disabled={product.stock === 0}
            >
              <ShoppingCart className="h-5 w-5 mr-2" />
              Add to Cart
            </Button>

            {/* Features */}
            <Card>
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-center gap-3">
                  <Truck className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm">Free delivery on orders over ₹500</span>
                </div>
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm">7 days return policy</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-foreground mb-6">
            Customer Reviews ({reviews.length})
          </h2>
          
          {reviews.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">No reviews yet. Be the first to review this product!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <Card key={review.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        {renderStars(review.rating)}
                        <p className="text-sm text-muted-foreground mt-1">
                          {new Date(review.created_at).toLocaleDateString("en-IN", {
                            year: "numeric",
                            month: "long",
                            day: "numeric"
                          })}
                        </p>
                      </div>
                    </div>
                    
                    {review.review_text && (
                      <p className="text-foreground mb-4">{review.review_text}</p>
                    )}
                    
                    {/* Review Media */}
                    <div className="flex flex-wrap gap-3">
                      {review.photo_url && (
                        <div className="w-32 h-32 rounded-lg overflow-hidden bg-muted">
                          <img 
                            src={review.photo_url} 
                            alt="Review photo"
                            className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => window.open(review.photo_url!, "_blank")}
                          />
                        </div>
                      )}
                      
                      {review.video_url && (
                        <div className="w-32 h-32 rounded-lg overflow-hidden bg-muted relative">
                          <video 
                            src={review.video_url}
                            className="w-full h-full object-cover"
                            controls
                          />
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="bg-background/80 rounded-full p-2">
                              <Play className="h-6 w-6 text-foreground" />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          {/* Customer Talk / Q&A Section */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
            <MessageSquare className="h-6 w-6" /> Talk with Seller
          </h2>
          
          <Card className="mb-6">
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold mb-2">Ask a Question</h3>
              <div className="flex flex-col gap-3">
                <Textarea 
                  placeholder="What would you like to know about this product?" 
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  className="min-h-[100px]"
                />
                <Button 
                  onClick={handleSubmitQuestion} 
                  disabled={!newQuestion.trim() || isSubmittingQuestion}
                  className="self-end"
                >
                  {isSubmittingQuestion ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div> : null}
                  Submit Question
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {questions.map((q) => (
              <Card key={q.id}>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="bg-secondary/30 p-4 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-semibold text-sm">
                          {q.profiles?.full_name || "Customer"} asked:
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(q.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-foreground">{q.question}</p>
                    </div>
                    
                    {q.answer && (
                      <div className="bg-primary/5 border border-primary/20 p-4 rounded-lg ml-8 relative">
                        <div className="absolute top-4 -left-4 w-4 h-[1px] bg-primary/20"></div>
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-semibold text-sm text-primary">
                            Seller answered:
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(q.answered_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-foreground">{q.answer}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};