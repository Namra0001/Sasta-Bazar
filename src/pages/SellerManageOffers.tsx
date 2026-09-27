import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Loader2, Tag, Percent, Ticket, Trash2 } from "lucide-react";

interface Product {
  id: string;
  name: string;
  price: number;
  original_price?: number;
  image_url: string;
}

interface Coupon {
  id: string;
  code: string;
  discount_amount: number;
  is_active: boolean;
}

export const SellerManageOffers = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  const [offerPrice, setOfferPrice] = useState("");
  const [offerDuration, setOfferDuration] = useState("");
  const [updating, setUpdating] = useState(false);

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [newCouponCode, setNewCouponCode] = useState("");
  const [newCouponDiscount, setNewCouponDiscount] = useState("");
  const [creatingCoupon, setCreatingCoupon] = useState(false);

  useEffect(() => {
    checkSellerRole();
  }, []);

  const checkSellerRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/seller/auth');
        return;
      }
      
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "seller")
        .limit(1)
        .maybeSingle();

      if (roleError) {
        if (user.email !== 'namradabhi0001@gmail.com') {
          navigate("/seller/auth");
          return;
        }
      } else if (!roleData && user.email !== 'namradabhi0001@gmail.com') {
        navigate("/seller/auth");
        return;
      }
      
      fetchProducts(user.id);
      fetchCoupons(user.id);
    } catch (error) {
      console.error('Error checking seller role:', error);
      navigate('/seller/auth');
    } finally {
      setIsCheckingAuth(false);
    }
  };

  const fetchProducts = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price, original_price, image_url")
        .eq("seller_id", userId)
        .order("created_at", { ascending: false });
        
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast({
        title: "Error",
        description: "Failed to fetch products",
        variant: "destructive"
      });
    }
  };

  const fetchCoupons = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .eq("seller_id", userId)
        .order("created_at", { ascending: false });
        
      if (error) throw error;
      setCoupons(data || []);
    } catch (error) {
      console.error("Error fetching coupons:", error);
    }
  };

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setOfferPrice(product.price.toString());
  };

  const applyOffer = async () => {
    if (!selectedProduct) return;
    const newPrice = parseInt(offerPrice);
    if (isNaN(newPrice) || newPrice <= 0) {
      toast({ title: "Error", description: "Please enter a valid offer price", variant: "destructive" });
      return;
    }
    
    let original = selectedProduct.original_price;
    if (!original) {
      original = selectedProduct.price; // Keep the old price as original price if not already set
    }
    
    if (newPrice >= original) {
      toast({ title: "Error", description: "Offer price must be lower than original price", variant: "destructive" });
      return;
    }

    let updatedTags = Array.isArray(selectedProduct.tags) ? [...selectedProduct.tags] : [];
    updatedTags = updatedTags.filter(t => !t.startsWith("offer_expires_at:"));
    
    const durationHours = parseInt(offerDuration);
    if (!isNaN(durationHours) && durationHours > 0) {
      const expiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString();
      updatedTags.push(`offer_expires_at:${expiresAt}`);
    }

    setUpdating(true);
    try {
      const { error } = await supabase
        .from("products")
        .update({
          price: newPrice,
          original_price: original,
          tags: updatedTags
        })
        .eq("id", selectedProduct.id);
        
      if (error) throw error;
      
      toast({ title: "Success", description: "Offer applied successfully!" });
      
      const { data: { user } } = await supabase.auth.getUser();
      if (user) fetchProducts(user.id);
      setSelectedProduct(null);
      setOfferPrice("");
      setOfferDuration("");
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to apply offer", variant: "destructive" });
    } finally {
      setUpdating(false);
    }
  };

  const removeOffer = async (product: Product) => {
    setUpdating(true);
    try {
      // Revert price to original_price, and set original_price to null
      const revertedPrice = product.original_price || product.price;
      
      let updatedTags = Array.isArray(product.tags) ? [...product.tags] : [];
      updatedTags = updatedTags.filter(t => !t.startsWith("offer_expires_at:"));
      
      const { error } = await supabase
        .from("products")
        .update({
          price: revertedPrice,
          original_price: null,
          tags: updatedTags
        })
        .eq("id", product.id);
        
      if (error) throw error;
      
      toast({ title: "Success", description: "Offer removed successfully!" });
      
      const { data: { user } } = await supabase.auth.getUser();
      if (user) fetchProducts(user.id);
      if (selectedProduct?.id === product.id) {
        setSelectedProduct(null);
        setOfferPrice("");
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to remove offer", variant: "destructive" });
    } finally {
      setUpdating(false);
    }
  };

  const createCoupon = async () => {
    if (!newCouponCode || !newCouponDiscount) {
      toast({ title: "Error", description: "Please enter code and discount", variant: "destructive" });
      return;
    }
    
    setCreatingCoupon(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { error } = await supabase.from("coupons").insert({
        seller_id: user.id,
        code: newCouponCode.toUpperCase(),
        discount_amount: parseInt(newCouponDiscount),
      });
      
      if (error) throw error;
      
      toast({ title: "Success", description: "Coupon created!" });
      setNewCouponCode("");
      setNewCouponDiscount("");
      fetchCoupons(user.id);
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to create coupon", variant: "destructive" });
    } finally {
      setCreatingCoupon(false);
    }
  };

  const deleteCoupon = async (id: string) => {
    try {
      const { error } = await supabase.from("coupons").delete().eq("id", id);
      if (error) throw error;
      
      toast({ title: "Success", description: "Coupon deleted!" });
      const { data: { user } } = await supabase.auth.getUser();
      if (user) fetchCoupons(user.id);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Verifying seller access...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate("/seller")}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Tag className="h-8 w-8" />
            Manage Offers
          </h1>
          <p className="text-muted-foreground mt-2">
            Add discounts to your products to feature them in the Trending & Offers section.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle>Set Offer</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!selectedProduct ? (
                  <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                    Select a product from the list to add an offer.
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 p-3 bg-secondary rounded-lg">
                      <img src={selectedProduct.image_url || "/placeholder.svg"} alt={selectedProduct.name} className="w-12 h-12 rounded object-cover" />
                      <div>
                        <p className="font-semibold text-sm line-clamp-1">{selectedProduct.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Current Price: ₹{selectedProduct.price}
                        </p>
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="offerPrice">New Discounted Price (₹)</Label>
                      <Input 
                        id="offerPrice" 
                        type="number" 
                        value={offerPrice}
                        onChange={(e) => setOfferPrice(e.target.value)}
                        placeholder="Enter offer price"
                        className="mt-1"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Original Price will be set to ₹{selectedProduct.original_price || selectedProduct.price}
                      </p>
                    </div>
                    
                    <div>
                      <Label htmlFor="offerDuration">Offer Duration (Hours) - Optional</Label>
                      <Input 
                        id="offerDuration" 
                        type="number" 
                        value={offerDuration}
                        onChange={(e) => setOfferDuration(e.target.value)}
                        placeholder="e.g. 24"
                        className="mt-1"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Offer will be automatically removed after this duration.
                      </p>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" className="flex-1" onClick={() => setSelectedProduct(null)} disabled={updating}>
                        Cancel
                      </Button>
                      <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white" onClick={applyOffer} disabled={updating}>
                        {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply Offer"}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-2 space-y-4">
            <h2 className="text-xl font-semibold">Your Products</h2>
            {products.length === 0 ? (
              <p className="text-muted-foreground">You don't have any products yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {products.map((product) => {
                  const hasOffer = product.original_price && product.original_price > product.price;
                  return (
                    <Card key={product.id} className={`overflow-hidden transition-all ${selectedProduct?.id === product.id ? 'ring-2 ring-primary' : ''}`}>
                      <div className="flex p-4 gap-4">
                        <div className="relative">
                          <img src={product.image_url || "/placeholder.svg"} alt={product.name} className="w-20 h-20 rounded-md object-cover" />
                          {hasOffer && (
                            <div className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full">
                              <Percent className="w-3 h-3" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 flex flex-col justify-between">
                          <div>
                            <h3 className="font-semibold text-sm line-clamp-2">{product.name}</h3>
                            <div className="mt-1">
                              <span className="font-bold text-lg text-primary">₹{product.price}</span>
                              {hasOffer && (
                                <span className="text-xs text-muted-foreground line-through ml-2">₹{product.original_price}</span>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex gap-2 mt-2">
                            <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => handleSelectProduct(product)}>
                              {hasOffer ? "Update Offer" : "Add Offer"}
                            </Button>
                            {hasOffer && (
                              <Button size="sm" variant="destructive" className="px-2" onClick={() => removeOffer(product)} disabled={updating}>
                                Remove
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        
        <div className="mt-12">
          <h2 className="text-2xl font-bold flex items-center gap-2 mb-6">
            <Ticket className="h-6 w-6" />
            Manage Coupons
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Create Coupon</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="couponCode">Coupon Code</Label>
                    <Input 
                      id="couponCode" 
                      value={newCouponCode}
                      onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())}
                      placeholder="e.g. SAVE50"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="couponDiscount">Discount Amount (₹)</Label>
                    <Input 
                      id="couponDiscount" 
                      type="number"
                      value={newCouponDiscount}
                      onChange={(e) => setNewCouponDiscount(e.target.value)}
                      placeholder="e.g. 100"
                      className="mt-1"
                    />
                  </div>
                  <Button className="w-full bg-gradient-primary hover:shadow-glow-primary" onClick={createCoupon} disabled={creatingCoupon}>
                    {creatingCoupon ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Coupon"}
                  </Button>
                </CardContent>
              </Card>
            </div>
            
            <div className="md:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Your Coupons</CardTitle>
                </CardHeader>
                <CardContent>
                  {coupons.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">No coupons created yet.</p>
                  ) : (
                    <div className="space-y-4">
                      {coupons.map((coupon) => (
                        <div key={coupon.id} className="flex items-center justify-between p-4 border border-border rounded-lg bg-secondary/30">
                          <div className="flex items-center gap-4">
                            <div className="bg-primary/10 p-3 rounded-lg text-primary font-bold tracking-wider">
                              {coupon.code}
                            </div>
                            <div>
                              <p className="font-semibold text-foreground">₹{coupon.discount_amount} OFF</p>
                              <p className="text-sm text-muted-foreground">{coupon.is_active ? "Active" : "Inactive"}</p>
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => deleteCoupon(coupon.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
