import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Package, Truck, CheckCircle, XCircle, Clock, RotateCcw, Star, Upload, Video, Image } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface OrderItem {
  product_id: string;
  product_name: string;
  price: number;
  quantity: number;
}

interface Order {
  id: string;
  order_number: string;
  items: OrderItem[];
  total_amount: number;
  delivery_address: string;
  status: string;
  created_at: string;
  delivered_at: string | null;
}

interface OrdersProps {
  onLogout: () => void;
}

export const Orders = ({ onLogout }: OrdersProps) => {
  const { cartCount } = useCart();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewText, setReviewText] = useState<{ [key: string]: string }>({});
  const [reviewRating, setReviewRating] = useState<{ [key: string]: number }>({});
  const [reviewPhotos, setReviewPhotos] = useState<{ [key: string]: File | null }>({});
  const [reviewVideos, setReviewVideos] = useState<{ [key: string]: File | null }>({});
  const [uploadingReview, setUploadingReview] = useState<{ [key: string]: boolean }>({});
  const [existingProducts, setExistingProducts] = useState<Set<string>>(new Set());
  const [showFeedback, setShowFeedback] = useState<{ [key: string]: boolean }>({});
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchOrders();
    fetchExistingProducts();
  }, []);

  const fetchExistingProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id');
      
      if (error) throw error;
      setExistingProducts(new Set(data.map(p => p.id)));
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchOrders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/');
        return;
      }

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders((data as unknown) as Order[]);
    } catch (error: any) {
      console.error('Error fetching orders:', error);
      toast({
        title: "Error",
        description: "Failed to load orders",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-5 w-5" />;
      case 'confirmed': return <Package className="h-5 w-5" />;
      case 'shipped': return <Truck className="h-5 w-5" />;
      case 'delivered': return <CheckCircle className="h-5 w-5" />;
      case 'received': return <CheckCircle className="h-5 w-5" />;
      case 'cancelled': return <XCircle className="h-5 w-5" />;
      case 'returned': return <RotateCcw className="h-5 w-5" />;
      default: return <Clock className="h-5 w-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'confirmed': return 'bg-blue-500';
      case 'shipped': return 'bg-purple-500';
      case 'delivered': return 'bg-green-500';
      case 'received': return 'bg-teal-500';
      case 'cancelled': return 'bg-red-500';
      case 'returned': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const getDeliveryEstimate = (createdAt: string, status: string) => {
    if (status === 'delivered') return 'Delivered';
    if (status === 'cancelled' || status === 'returned') return 'N/A';
    
    const orderDate = new Date(createdAt);
    const estimatedDate = new Date(orderDate);
    estimatedDate.setDate(estimatedDate.getDate() + 7);
    
    return `Est. ${estimatedDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;
  };

  const handleCancelOrder = async (orderId: string, orderNumber: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', orderId);

      if (error) throw error;

      toast({
        title: "Order Cancelled",
        description: `Order ${orderNumber} has been cancelled successfully`
      });
      
      fetchOrders();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to cancel order",
        variant: "destructive"
      });
    }
  };

  const handleReturnOrder = async (orderId: string, orderNumber: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'returned' })
        .eq('id', orderId);

      if (error) throw error;

      toast({
        title: "Return Initiated",
        description: `Return request for order ${orderNumber} has been submitted`
      });
      
      fetchOrders();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to initiate return",
        variant: "destructive"
      });
    }
  };

  const handleProductReceived = async (orderId: string, orderNumber: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'received' })
        .eq('id', orderId);

      if (error) throw error;

      toast({
        title: "Order Received",
        description: `Thank you for confirming receipt of order ${orderNumber}`
      });
      
      fetchOrders();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive"
      });
    }
  };

  const handleSubmitReview = async (orderId: string, productId: string, productName: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if product exists
      if (!existingProducts.has(productId)) {
        toast({
          title: "Product Not Available",
          description: "This product is no longer available for review",
          variant: "destructive"
        });
        return;
      }

      const reviewKey = `${orderId}-${productId}`;
      setUploadingReview({ ...uploadingReview, [reviewKey]: true });

      // Check if review already exists
      const { data: existingReview } = await supabase
        .from('product_reviews')
        .select('id, rating')
        .eq('order_id', orderId)
        .eq('product_id', productId)
        .maybeSingle();

      let photoUrl = "";
      let videoUrl = "";
      
      // Upload photo if selected
      const photoFile = reviewPhotos[reviewKey];
      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}-photo.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('review-photos')
          .upload(fileName, photoFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('review-photos')
          .getPublicUrl(fileName);

        photoUrl = publicUrl;
      }

      // Upload video if selected
      const videoFile = reviewVideos[reviewKey];
      if (videoFile) {
        const fileExt = videoFile.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}-video.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('review-photos')
          .upload(fileName, videoFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('review-photos')
          .getPublicUrl(fileName);

        videoUrl = publicUrl;
      }

      const newRating = reviewRating[reviewKey] || 5;

      if (existingReview) {
        // Update existing review
        const updateData: any = {
          review_text: reviewText[reviewKey] || '',
          rating: newRating,
        };
        if (photoUrl) updateData.photo_url = photoUrl;
        if (videoUrl) updateData.video_url = videoUrl;

        const { error } = await supabase
          .from('product_reviews')
          .update(updateData)
          .eq('id', existingReview.id);
        if (error) throw error;
      } else {
        // Insert new review
        const { error } = await supabase.from('product_reviews').insert({
          order_id: orderId,
          product_id: productId,
          user_id: user.id,
          review_text: reviewText[reviewKey] || '',
          rating: newRating,
          photo_url: photoUrl || null,
          video_url: videoUrl || null
        });
        if (error) throw error;
      }

      // Update product rating and review count
      const { data: currentProduct } = await supabase
        .from('products')
        .select('rating, review_count')
        .eq('id', productId)
        .single();
        
      if (currentProduct) {
        let updatedReviewCount = currentProduct.review_count || 0;
        let updatedRating = currentProduct.rating || 0;

        if (!existingReview) {
          // New review
          updatedReviewCount += 1;
          updatedRating = ((updatedRating * (updatedReviewCount - 1)) + newRating) / updatedReviewCount;
        } else {
          // Updated review
          if (updatedReviewCount > 0) {
            updatedRating = ((updatedRating * updatedReviewCount) - existingReview.rating + newRating) / updatedReviewCount;
          } else {
            updatedRating = newRating;
            updatedReviewCount = 1;
          }
        }

        await supabase.from('products').update({
          rating: updatedRating,
          review_count: updatedReviewCount
        }).eq('id', productId);
      }

      toast({
        title: "Review Submitted",
        description: `Thank you for reviewing ${productName}! Your rating has been updated.`
      });

      setReviewText({ ...reviewText, [reviewKey]: '' });
      setReviewRating({ ...reviewRating, [reviewKey]: 5 });
      setReviewPhotos({ ...reviewPhotos, [reviewKey]: null });
      setReviewVideos({ ...reviewVideos, [reviewKey]: null });
      setUploadingReview({ ...uploadingReview, [reviewKey]: false });
    } catch (error: any) {
      console.error('Error submitting review:', error);
      toast({
        title: "Error",
        description: "Failed to submit review. Please try again.",
        variant: "destructive"
      });
      const reviewKey = `${orderId}-${productId}`;
      setUploadingReview({ ...uploadingReview, [reviewKey]: false });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar cartCount={cartCount} onLogout={onLogout} />
        <main className="container mx-auto px-4 py-8">
          <p className="text-center text-muted-foreground">Loading orders...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar cartCount={cartCount} onLogout={onLogout} />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">My Orders</h1>
          <p className="text-muted-foreground">
            Track and manage your orders
          </p>
        </div>

        {orders.length === 0 ? (
          <Card className="p-12 text-center">
            <CardContent>
              <Package className="h-24 w-24 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-2xl font-semibold mb-2">No orders yet</h2>
              <p className="text-muted-foreground mb-6">Start shopping to see your orders here!</p>
              <Button onClick={() => navigate("/shop")} className="bg-neon-green text-primary-foreground hover:bg-neon-green/90">
                Start Shopping
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <Card key={order.id} className="hover:shadow-glow-primary transition-all duration-300">
                <CardHeader>
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <CardTitle className="text-xl">Order #{order.order_number}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Placed on {new Date(order.created_at).toLocaleDateString('en-IN', { 
                          day: 'numeric', 
                          month: 'long', 
                          year: 'numeric' 
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={`${getStatusColor(order.status)} text-white flex items-center gap-1 px-3 py-1`}>
                        {getStatusIcon(order.status)}
                        <span className="capitalize">{order.status}</span>
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Order Items */}
                  <div className="space-y-3">
                    {order.items.map((item: OrderItem, idx: number) => (
                      <div key={idx} className="flex justify-between items-center p-3 bg-secondary rounded-lg">
                        <div>
                          <p className="font-semibold">{item.product_name}</p>
                          <p className="text-sm text-muted-foreground">Quantity: {item.quantity}</p>
                        </div>
                        <p className="font-bold">₹{item.price}</p>
                      </div>
                    ))}
                  </div>

                  {/* Delivery Info */}
                  <div className="grid md:grid-cols-2 gap-4 pt-4 border-t">
                    <div>
                      <p className="text-sm font-semibold mb-1">Delivery Address</p>
                      <p className="text-sm text-muted-foreground">{order.delivery_address}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold mb-1">Estimated Delivery</p>
                      <p className="text-sm text-muted-foreground">{getDeliveryEstimate(order.created_at, order.status)}</p>
                    </div>
                  </div>

                  {/* Total Amount */}
                  <div className="flex justify-between items-center pt-4 border-t">
                    <span className="text-lg font-semibold">Total Amount</span>
                    <span className="text-2xl font-bold text-primary">₹{order.total_amount}</span>
                  </div>

                  {/* Order Received Button */}
                  {(order.status === 'delivered' || order.status === 'ready_for_delivery') && (
                    <div className="pt-4">
                      <Button 
                        className="w-full bg-neon-green text-primary-foreground hover:bg-neon-green/90"
                        onClick={() => handleProductReceived(order.id, order.order_number)}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Order Received
                      </Button>
                    </div>
                  )}

                  {/* Action Buttons */}
                  {(order.status === 'pending' || order.status === 'delivered') && (
                    <div className="flex flex-wrap gap-3 pt-4">
                      {order.status === 'pending' && (
                        <Button 
                          variant="destructive" 
                          onClick={() => handleCancelOrder(order.id, order.order_number)}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Cancel Order
                        </Button>
                      )}
                      
                      {order.status === 'delivered' && (
                        <Button 
                          variant="outline"
                          onClick={() => handleReturnOrder(order.id, order.order_number)}
                        >
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Return Product
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Give Feedback Button for Received Orders */}
                  {order.status === 'received' && (
                    <div className="pt-4">
                      <Button 
                        variant="outline"
                        className="w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                        onClick={() => setShowFeedback({ ...showFeedback, [order.id]: !showFeedback[order.id] })}
                      >
                        <Star className="h-4 w-4 mr-2" />
                        {showFeedback[order.id] ? 'Hide Feedback' : 'Give Feedback'}
                      </Button>
                    </div>
                  )}

                  {/* Product Review Section for Received Orders */}
                  {order.status === 'received' && showFeedback[order.id] && (
                    <div className="pt-4 border-t space-y-4">
                      <Label className="text-base font-semibold">Leave Product Reviews</Label>
                      {order.items.map((item: OrderItem, idx: number) => {
                        const reviewKey = `${order.id}-${item.product_id}`;
                        const isProductAvailable = existingProducts.has(item.product_id);
                        
                        return (
                          <div key={idx} className="p-4 bg-secondary rounded-lg space-y-3">
                            <p className="font-semibold">{item.product_name}</p>
                            
                            {!isProductAvailable && (
                              <p className="text-sm text-muted-foreground">
                                This product is no longer available for review
                              </p>
                            )}
                            
                            {isProductAvailable && (
                              <>
                                {/* Star Rating */}
                                <div>
                                  <Label className="text-sm mb-2 block">Rating</Label>
                                  <div className="flex gap-2">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <Star
                                        key={star}
                                        className={`h-7 w-7 cursor-pointer transition-colors ${
                                          star <= (reviewRating[reviewKey] || 5) 
                                            ? 'text-yellow-400 fill-yellow-400' 
                                            : 'text-gray-300'
                                        }`}
                                        onClick={() => setReviewRating({ ...reviewRating, [reviewKey]: star })}
                                      />
                                    ))}
                                  </div>
                                </div>
                                
                                {/* Text Feedback */}
                                <div>
                                  <Label className="text-sm mb-2 block">Your Review (Optional)</Label>
                                  <Textarea
                                    placeholder="Share your experience with this product..."
                                    value={reviewText[reviewKey] || ''}
                                    onChange={(e) => setReviewText({ ...reviewText, [reviewKey]: e.target.value })}
                                    rows={3}
                                  />
                                </div>
                                
                                {/* Photo Upload */}
                                <div>
                                  <Label htmlFor={`photo-${reviewKey}`} className="text-sm mb-2 block">
                                    <Image className="h-4 w-4 inline mr-1" />
                                    Add Photo (Optional)
                                  </Label>
                                  <div className="flex items-center gap-2">
                                    <Input
                                      id={`photo-${reviewKey}`}
                                      type="file"
                                      accept="image/*"
                                      onChange={(e) => setReviewPhotos({ ...reviewPhotos, [reviewKey]: e.target.files?.[0] || null })}
                                      className="bg-background"
                                    />
                                    {reviewPhotos[reviewKey] && (
                                      <Upload className="h-4 w-4 text-neon-green" />
                                    )}
                                  </div>
                                </div>

                                {/* Video Upload */}
                                <div>
                                  <Label htmlFor={`video-${reviewKey}`} className="text-sm mb-2 block">
                                    <Video className="h-4 w-4 inline mr-1" />
                                    Add Video (Optional)
                                  </Label>
                                  <div className="flex items-center gap-2">
                                    <Input
                                      id={`video-${reviewKey}`}
                                      type="file"
                                      accept="video/*"
                                      onChange={(e) => setReviewVideos({ ...reviewVideos, [reviewKey]: e.target.files?.[0] || null })}
                                      className="bg-background"
                                    />
                                    {reviewVideos[reviewKey] && (
                                      <Video className="h-4 w-4 text-neon-green" />
                                    )}
                                  </div>
                                </div>
                                
                                <Button 
                                  onClick={() => handleSubmitReview(order.id, item.product_id, item.product_name)}
                                  className="w-full bg-neon-green text-primary-foreground hover:bg-neon-green/90"
                                  disabled={uploadingReview[reviewKey]}
                                >
                                  {uploadingReview[reviewKey] ? "Uploading..." : "Submit Review"}
                                </Button>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};