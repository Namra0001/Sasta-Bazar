import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import QRCode from 'qrcode';
import { Upload, Plus, Trash2, Package, Star, Image as ImageIcon, Search, ShoppingBag, Printer, Loader2, Sun, Moon, ArrowUp, CheckCircle, Edit, Tag, MessageSquare, X } from "lucide-react";
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
  product_code?: string;
  image_url: string;
  image_urls?: string[];
  video_urls?: string[];
  specifications: any;
  tags: string[];
  is_active: boolean;
  rating: number;
  review_count: number;
  sold_count: number;
}
interface OrderItem {
  product_id: string;
  product_name: string;
  price: number;
  quantity: number;
  size?: string | null;
  color?: string | null;
  image_url?: string | null;
}
interface ReceivedOrder {
  id: string;
  order_number: string;
  items: OrderItem[];
  total_amount: number;
  delivery_address: string;
  status: string;
  created_at: string;
  user_id: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
}
export const SellerDashboard = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [unansweredQuestionsCount, setUnansweredQuestionsCount] = useState(0);
  const [receivedOrders, setReceivedOrders] = useState<ReceivedOrder[]>([]);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [videoFiles, setVideoFiles] = useState<File[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"products" | "pending" | "orders">("products");
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [selectAllOrders, setSelectAllOrders] = useState(false);

  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const {
    toast
  } = useToast();
  useEffect(() => {
    checkSellerRole();
  }, []);
  const checkSellerRole = async () => {
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
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
        console.error('Role check error:', roleError);
        // Fallback check
        if (user.email !== 'namradabhi0001@gmail.com') {
          navigate("/seller/auth");
          return;
        }
      } else if (!roleData && user.email !== 'namradabhi0001@gmail.com') {
        navigate("/seller/auth");
        return;
      }

      fetchProducts();
      fetchReceivedOrders();
      fetchUnansweredQuestions(user.id);
    } catch (error) {
      console.error('Error checking seller role:', error);
      navigate('/seller/auth');
    } finally {
      setIsCheckingAuth(false);
    }
  };
  
  const fetchUnansweredQuestions = async (userId: string) => {
    try {
      const { count, error } = await supabase
        .from("product_questions")
        .select('*', { count: 'exact', head: true })
        .eq("seller_id", userId)
        .is("answer", null);
        
      if (!error && count !== null) {
        setUnansweredQuestionsCount(count);
      }
    } catch (error) {
      console.error("Error fetching questions count:", error);
    }
  };

  const fetchProducts = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from("products").select("*").order("created_at", {
        ascending: false
      });
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };
  const fetchReceivedOrders = async () => {
    try {
      const {
        data: ordersData,
        error
      } = await supabase.from("orders").select("*").order("created_at", {
        ascending: false
      });
      if (error) throw error;
      
      // Fetch all products to get their images
      const { data: productsData } = await supabase.from("products").select("id, image_url");
      const productImagesMap = new Map(productsData?.map(p => [p.id, p.image_url]) || []);
      
      // Enrich order items with product images if missing
      const enrichedOrders = (ordersData || []).map(order => ({
        ...order,
        items: (Array.isArray(order.items) ? order.items : []).map((item: any) => ({
          ...item,
          image_url: item.image_url || productImagesMap.get(item.product_id) || null
        }))
      }));
      
      setReceivedOrders(enrichedOrders as unknown as ReceivedOrder[]);
    } catch (error) {
      console.error("Error fetching orders:", error);
    }
  };
  const pendingOrders = receivedOrders.filter(order => order.status === 'pending');
  const allOrders = receivedOrders;
  const [newProduct, setNewProduct] = useState({
    name: "",
    description: "",
    price: "",
    originalPrice: "",
    category: "",
    gender: "",
    brand: "",
    productCode: "",
    sizes: [] as string[],
    colors: [] as string[],
    stock: "",
    specifications: {} as {
      [key: string]: string;
    },
    tags: [] as string[]
  });
  const categories = ["shirts", "jeans", "dresses", "jackets", "blazers", "skirts", "accessories"];
  const genderOptions = ["men", "women", "unisex"];
  const sizeOptions = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];
  const colorOptions = ["Black", "White", "Red", "Blue", "Green", "Yellow", "Pink", "Purple", "Gray", "Brown"];
  // Add product has been moved to /seller/add-product
  const handleEditProduct = async () => {
    if (!editingProduct) return;
    if (!newProduct.name || !newProduct.price || !newProduct.category) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    // Validate max 4 images
    if (imageFiles.length > 4) {
      toast({
        title: "Error",
        description: "Maximum 4 images allowed",
        variant: "destructive"
      });
      return;
    }
    
    if (!newProduct.productCode) {
      toast({ title: "Error", description: "Product code is required", variant: "destructive" });
      return;
    }

    try {
      let imageUrl = editingProduct.image_url;
      let imageUrls = editingProduct.image_urls || [];
      let videoUrls = editingProduct.video_urls || [];
      setUploadingMedia(true);

      // Upload new images if selected (max 4)
      if (imageFiles.length > 0) {
        imageUrls = [];
        imageUrl = "";
        for (const imageFile of imageFiles.slice(0, 4)) {
          const fileExt = imageFile.name.split('.').pop();
          const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
          const {
            error: uploadError
          } = await supabase.storage.from('product-images').upload(fileName, imageFile);
          if (uploadError) throw uploadError;
          const {
            data: {
              publicUrl
            }
          } = supabase.storage.from('product-images').getPublicUrl(fileName);
          imageUrls.push(publicUrl);
          if (!imageUrl) imageUrl = publicUrl;
        }
      }

      // Upload new videos if selected
      if (videoFiles.length > 0) {
        videoUrls = [];
        for (const videoFile of videoFiles) {
          const fileExt = videoFile.name.split('.').pop();
          const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
          const {
            error: uploadError
          } = await supabase.storage.from('product-images').upload(fileName, videoFile);
          if (uploadError) throw uploadError;
          const {
            data: {
              publicUrl
            }
          } = supabase.storage.from('product-images').getPublicUrl(fileName);
          videoUrls.push(publicUrl);
        }
      }
      setUploadingMedia(false);
      const newPrice = parseInt(newProduct.price);
      const {
        error
      } = await supabase.from("products").update({
        name: newProduct.name,
        description: newProduct.description,
        price: newPrice,
        original_price: newProduct.originalPrice ? parseInt(newProduct.originalPrice) : null,
        category: newProduct.category,
        gender: newProduct.gender,
        brand: newProduct.brand,
        sizes: newProduct.sizes,
        colors: newProduct.colors,
        stock: parseInt(newProduct.stock) || 0,
        image_url: imageUrl,
        image_urls: imageUrls,
        video_urls: videoUrls,
        product_code: newProduct.productCode,
        specifications: newProduct.specifications,
        tags: newProduct.tags
      }).eq("id", editingProduct.id);
      if (error) throw error;
      
      // Log price history if price changed
      if (newPrice !== editingProduct.price) {
        const { error: historyError } = await supabase.from("price_history").insert({
          product_id: editingProduct.id,
          price: editingProduct.price
        });
        if (historyError) {
          console.error("FAILED TO INSERT PRICE HISTORY:", historyError);
          throw new Error("Price history insert failed: " + historyError.message);
        }
      }

      await fetchProducts();
      resetForm();
      setEditingProduct(null);
      toast({
        title: "Product Updated!",
        description: "Your product has been successfully updated"
      });
    } catch (error) {
      console.error("Error updating product:", error);
      setUploadingMedia(false);
      toast({
        title: "Error",
        description: error?.message || "Failed to update product",
        variant: "destructive"
      });
    }
  };
  const resetForm = () => {
    setNewProduct({
      name: "",
      description: "",
      price: "",
      originalPrice: "",
      category: "",
      gender: "",
      brand: "",
      productCode: "",
      sizes: [],
      colors: [],
      stock: "",
      specifications: {},
      tags: []
    });
    setImageFiles([]);
    setVideoFiles([]);
  };
  const startEditProduct = (product: Product) => {
    setEditingProduct(product);
    setNewProduct({
      name: product.name,
      description: product.description || "",
      price: product.price.toString(),
      originalPrice: product.original_price?.toString() || "",
      category: product.category,
      gender: product.gender || "",
      brand: product.brand || "",
      productCode: product.product_code || "",
      sizes: product.sizes || [],
      colors: product.colors || [],
      stock: product.stock.toString(),
      specifications: product.specifications || {},
      tags: product.tags || []
    });
    setImageFiles([]);
    setVideoFiles([]);
    // Scroll to top to show edit form
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  };
  const cancelEdit = () => {
    setEditingProduct(null);
    resetForm();
  };
  const toggleProductStatus = async (id: string) => {
    const product = products.find(p => p.id === id);
    if (!product) return;
    try {
      const {
        error
      } = await supabase.from("products").update({
        is_active: !product.is_active
      }).eq("id", id);
      if (error) throw error;
      await fetchProducts();
    } catch (error) {
      console.error("Error updating product:", error);
    }
  };
  const deleteProduct = async (id: string) => {
    try {
      const {
        data,
        error
      } = await supabase.from("products").delete().eq("id", id).select();
      
      if (error) throw error;
      
      if (!data || data.length === 0) {
        throw new Error("Could not permanently delete product. This is likely due to database permissions (RLS) or because the product does not belong to you.");
      }

      await fetchProducts();
      toast({
        title: "Product Deleted",
        description: "Product has been permanently removed from your listings"
      });
    } catch (error: any) {
      console.error("Error deleting product:", error);
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete product",
        variant: "destructive"
      });
    }
  };
  const toggleSize = (size: string) => {
    setNewProduct(prev => ({
      ...prev,
      sizes: prev.sizes.includes(size) ? prev.sizes.filter(s => s !== size) : [...prev.sizes, size]
    }));
  };
  const toggleColor = (color: string) => {
    setNewProduct(prev => ({
      ...prev,
      colors: prev.colors.includes(color) ? prev.colors.filter(c => c !== color) : [...prev.colors, color]
    }));
  };
  const handleReadyForDelivery = async (orderId: string) => {
    try {
      const {
        error
      } = await supabase.from('orders').update({
        status: 'ready_for_delivery'
      }).eq('id', orderId);
      if (error) throw error;
      toast({
        title: "Order Ready",
        description: "Order marked as ready for delivery"
      });
      await fetchReceivedOrders();
    } catch (error) {
      console.error('Error updating order:', error);
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive"
      });
    }
  };
  const handleBulkReadyForDelivery = async () => {
    if (selectedOrders.length === 0) {
      toast({
        title: "No orders selected",
        description: "Please select at least one order",
        variant: "destructive"
      });
      return;
    }
    try {
      const {
        error
      } = await supabase.from('orders').update({
        status: 'ready_for_delivery'
      }).in('id', selectedOrders);
      if (error) throw error;
      toast({
        title: "Orders Ready",
        description: `${selectedOrders.length} order(s) marked as ready for delivery`
      });
      setSelectedOrders([]);
      setSelectAllOrders(false);
      await fetchReceivedOrders();
    } catch (error) {
      console.error('Error updating orders:', error);
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive"
      });
    }
  };
  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrders(prev => prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]);
  };
  const handleSelectAllOrders = () => {
    if (selectAllOrders) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(pendingOrders.map(order => order.id));
    }
    setSelectAllOrders(!selectAllOrders);
  };
  const getEstimatedDelivery = (orderDate: string) => {
    const date = new Date(orderDate);
    date.setDate(date.getDate() + 4); // 4 days from order date
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short'
    });
  };
  const handlePrintOrder = async (order: ReceivedOrder) => {
    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) return;
    const estimatedDelivery = getEstimatedDelivery(order.created_at);
    
    let qrCodeDataUrl = '';
    try {
      const trackingUrl = `${window.location.origin}/delivery/${order.id}`;
      qrCodeDataUrl = await QRCode.toDataURL(trackingUrl, { margin: 1, width: 150 });
    } catch (err) {
      console.error('Error generating QR code:', err);
    }
    
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Order #${order.order_number}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #333; }
            .header { border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
            .section { margin-bottom: 20px; }
            .section h2 { font-size: 18px; color: #555; margin-bottom: 10px; }
            .info-row { display: flex; justify-content: space-between; margin: 5px 0; }
            .label { font-weight: bold; }
            .items { border-collapse: collapse; width: 100%; margin-top: 10px; }
            .items th, .items td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            .items th { background-color: #f2f2f2; }
            .total { font-size: 20px; font-weight: bold; margin-top: 20px; text-align: right; }
            @media print {
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <div>
                <h1>Delivery Order</h1>
                <p><strong>Order ID:</strong> ${order.order_number}</p>
            <p><strong>Order Date:</strong> ${new Date(order.created_at).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}</p>
            <p style="color: #4CAF50; font-size: 16px; font-weight: bold; margin-top: 10px;">
              <strong>Estimated Delivery:</strong> Est. ${estimatedDelivery}
            </p>
              </div>
              <div>
                ${qrCodeDataUrl ? `<img src="${qrCodeDataUrl}" alt="Tracking QR Code" style="border: 2px solid #ddd; border-radius: 8px;" />
                <p style="text-align: center; font-size: 12px; margin-top: 4px; color: #666;">Scan to track<br>Live Location</p>` : ''}
              </div>
            </div>
          </div>

          <div class="section">
            <h2>Customer Information</h2>
            <div class="info-row">
              <span class="label">Name:</span>
              <span>${order.customer_name || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="label">Phone:</span>
              <span>${order.customer_phone || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="label">Email:</span>
              <span>${order.customer_email || 'N/A'}</span>
            </div>
          </div>

          <div class="section">
            <h2>Delivery Address</h2>
            <p>${order.delivery_address}</p>
          </div>

          <div class="section">
            <h2>Order Items</h2>
            <table class="items">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Quantity</th>
                  <th>Price</th>
                </tr>
              </thead>
              <tbody>
                ${order.items.map(item => `
                  <tr>
                    <td>${item.product_name}</td>
                    <td>${item.quantity}</td>
                    <td>₹${item.price}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="total">
            Total Amount: ₹${order.total_amount}
          </div>

          <button onclick="window.print()" style="margin-top: 20px; padding: 10px 20px; background-color: #4CAF50; color: white; border: none; cursor: pointer; font-size: 16px;">
            Print Order
          </button>
        </body>
      </html>
    `;
    printWindow.document.write(printContent);
    printWindow.document.close();
  };
  const filteredProducts = products.filter(product => product.name.toLowerCase().includes(searchQuery.toLowerCase()) || product.description?.toLowerCase().includes(searchQuery.toLowerCase()) || product.product_code?.toLowerCase().includes(searchQuery.toLowerCase()));
  if (isCheckingAuth) {
    return <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Verifying seller access...</p>
        </div>
      </div>;
  }
  return <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8 bg-white p-4 rounded-md shadow-sm border border-border">
          <div 
            className="flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => window.open('/shop', '_blank')}
          >
            <img 
              src="/logo.png" 
              alt="Sasta Bazar" 
              className="h-8 md:h-12 object-contain"
            />
          </div>
          <div className="flex gap-3 items-center flex-wrap justify-end">
            <Button variant="outline" onClick={() => window.open('/shop', '_blank')}>
              <ShoppingBag className="h-4 w-4 mr-2" />
              Go to Shop
            </Button>
            <Link to="/seller/profile">
              <Button variant="outline">
                Manage Profile
              </Button>
            </Link>
            <Button variant="outline" onClick={() => navigate("/seller/customer-talk")} className="border-primary text-primary hover:bg-primary/10 relative">
              <MessageSquare className="h-4 w-4 mr-2" />
              Customer Talk
              {unansweredQuestionsCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {unansweredQuestionsCount}
                </span>
              )}
            </Button>
            <Button variant="outline" onClick={() => navigate("/seller/manage-offers")} className="border-primary text-primary hover:bg-primary/10">
              <Tag className="h-4 w-4 mr-2" />
              Manage Offers
            </Button>
            <Button onClick={() => navigate("/seller/add-product")} className="bg-gradient-primary hover:shadow-glow-primary">
              <Plus className="h-4 w-4 mr-2" />
              Add New Product
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-[#F3F4F6] text-black border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Products</p>
                  <p className="text-2xl font-bold">{products.length}</p>
                </div>
                <Package className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-[#F3F4F6] text-black border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Sales</p>
                  <p className="text-2xl font-bold">
                    ₹{receivedOrders.reduce((sum, order) => sum + Number(order.total_amount), 0).toLocaleString()}
                  </p>
                </div>
                <ArrowUp className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-[#F3F4F6] text-black border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Items Sold</p>
                  <p className="text-2xl font-bold">
                    {receivedOrders.reduce((sum, order) => {
                    const items = order.items as OrderItem[];
                    return sum + items.reduce((itemSum, item) => itemSum + item.quantity, 0);
                  }, 0)}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-[#F3F4F6] text-black border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Avg Rating</p>
                  <p className="text-2xl font-bold">
                    {(() => {
                      const ratedProducts = products.filter(p => Number(p.rating) > 0);
                      return ratedProducts.length > 0 
                        ? (ratedProducts.reduce((sum, p) => sum + Number(p.rating), 0) / ratedProducts.length).toFixed(1) 
                        : "0.0";
                    })()}
                  </p>
                </div>
                <Star className="h-8 w-8 text-pink-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Add Product Form removed */}

        {/* Edit Product Form */}
        {editingProduct && <Card className="mb-8 bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Edit Product</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="edit-name">Product Name *</Label>
                  <Input id="edit-name" value={newProduct.name} onChange={e => setNewProduct({
                ...newProduct,
                name: e.target.value
              })} placeholder="Enter product name" className="bg-secondary border-border" />
                </div>
                
                <div>
                  <Label htmlFor="edit-brand">Brand</Label>
                  <Input id="edit-brand" value={newProduct.brand} onChange={e => setNewProduct({
                ...newProduct,
                brand: e.target.value
              })} placeholder="Enter brand name" className="bg-secondary border-border" />
                </div>
              </div>

              <div>
                <Label htmlFor="edit-product-code">Product Code (SKU) *</Label>
                <Input id="edit-product-code" value={newProduct.productCode} onChange={e => setNewProduct({
              ...newProduct,
              productCode: e.target.value
            })} placeholder="e.g. SL-001" className="bg-secondary border-border" />
              </div>

              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Textarea id="edit-description" value={newProduct.description} onChange={e => setNewProduct({
              ...newProduct,
              description: e.target.value
            })} placeholder="Detailed product description..." className="bg-secondary border-border min-h-[100px]" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div>
                  <Label htmlFor="edit-price">Price (₹) *</Label>
                  <Input id="edit-price" type="number" value={newProduct.price} onChange={e => setNewProduct({
                ...newProduct,
                price: e.target.value
              })} placeholder="0" className="bg-secondary border-border" />
                </div>
                
                <div>
                  <Label htmlFor="edit-originalPrice">Original Price (₹)</Label>
                  <Input id="edit-originalPrice" type="number" value={newProduct.originalPrice} onChange={e => setNewProduct({
                ...newProduct,
                originalPrice: e.target.value
              })} placeholder="0" className="bg-secondary border-border" />
                </div>
                
                <div>
                  <Label htmlFor="edit-stock">Stock Quantity *</Label>
                  <Input id="edit-stock" type="number" value={newProduct.stock} onChange={e => setNewProduct({
                ...newProduct,
                stock: e.target.value
              })} placeholder="0" className="bg-secondary border-border" />
                </div>
                
                <div>
                  <Label htmlFor="edit-category">Category *</Label>
                  <Select value={newProduct.category} onValueChange={value => setNewProduct({
                ...newProduct,
                category: value
              })}>
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="edit-gender">Gender</Label>
                <Select value={newProduct.gender} onValueChange={value => setNewProduct({
              ...newProduct,
              gender: value
            })}>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    {genderOptions.map(gender => <SelectItem key={gender} value={gender}>{gender}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Available Sizes</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {sizeOptions.map(size => <Button key={size} type="button" variant={newProduct.sizes.includes(size) ? "neon" : "outline"} size="sm" onClick={() => toggleSize(size)}>
                      {size}
                    </Button>)}
                </div>
              </div>

              <div>
                <Label>Available Colors</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {colorOptions.map(color => <Button key={color} type="button" variant={newProduct.colors.includes(color) ? "neon" : "outline"} size="sm" onClick={() => toggleColor(color)}>
                      {color}
                    </Button>)}
                </div>
              </div>

              {/* Show existing images */}
              {editingProduct.image_urls && editingProduct.image_urls.length > 0 && (
                <div>
                  <Label>Current Images</Label>
                  <div className="grid grid-cols-4 gap-4 mt-2">
                    {editingProduct.image_urls.map((url, idx) => (
                      <div key={idx} className="relative group">
                        <img 
                          src={url} 
                          alt={`Product image ${idx + 1}`}
                          className="w-full h-24 object-cover rounded-lg border border-border"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const newImageUrls = editingProduct.image_urls?.filter((_, i) => i !== idx) || [];
                            setEditingProduct({
                              ...editingProduct,
                              image_urls: newImageUrls,
                              image_url: newImageUrls.length > 0 ? newImageUrls[0] : ''
                            });
                          }}
                          className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow-md z-10"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        {idx !== 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              const newUrls = [...editingProduct.image_urls!];
                              const temp = newUrls[0];
                              newUrls[0] = newUrls[idx];
                              newUrls[idx] = temp;
                              setEditingProduct({
                                ...editingProduct,
                                image_urls: newUrls,
                                image_url: newUrls[0]
                              });
                            }}
                            className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-black/60 text-white text-xs px-2 py-1 rounded shadow opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            Set Main
                          </button>
                        )}
                        {idx === 0 && (
                          <div className="absolute top-2 left-2 bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded shadow">
                            MAIN
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Upload new images to replace existing ones
                  </p>
                </div>
              )}

              <div>
                <Label htmlFor="edit-images">Product Images (Upload new to replace existing, max 4)</Label>
                <div className="mt-2">
                  <Input id="edit-images" type="file" accept="image/*" multiple onChange={e => setImageFiles(Array.from(e.target.files || []))} className="bg-secondary border-border" />
                  {imageFiles.length > 0 && (
                    <div className="mt-2 space-y-2">
                      <p className="text-sm text-muted-foreground">Selected Files (Select Main Image):</p>
                      {imageFiles.map((f, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <input 
                            type="radio" 
                            name="mainImage" 
                            checked={i === 0} 
                            onChange={() => {
                              if (i !== 0) {
                                const newFiles = [...imageFiles];
                                const temp = newFiles[0];
                                newFiles[0] = newFiles[i];
                                newFiles[i] = temp;
                                setImageFiles(newFiles);
                              }
                            }} 
                          />
                          <span className="text-sm">{f.name} {i === 0 && <span className="text-primary font-bold ml-2">(Main)</span>}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Show existing videos */}
              {editingProduct.video_urls && editingProduct.video_urls.length > 0 && (
                <div>
                  <Label>Current Videos</Label>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    {editingProduct.video_urls.map((url, idx) => (
                      <div key={idx} className="relative">
                        <video 
                          src={url} 
                          className="w-full h-32 object-cover rounded-lg border border-border"
                          controls
                        />
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Upload new videos to replace existing ones
                  </p>
                </div>
              )}

              <div>
                <Label htmlFor="edit-videos">Product Videos (Upload new to replace existing, optional)</Label>
                <div className="mt-2">
                  <Input id="edit-videos" type="file" accept="video/*" multiple onChange={e => setVideoFiles(Array.from(e.target.files || []))} className="bg-secondary border-border" />
                  {videoFiles.length > 0 && <p className="text-sm text-muted-foreground mt-2">
                      Selected: {videoFiles.map(f => f.name).join(', ')}
                    </p>}
                </div>
              </div>

              <div className="flex gap-4">
                <Button onClick={handleEditProduct} className="bg-gradient-primary hover:shadow-glow-primary" disabled={uploadingMedia}>
                  {uploadingMedia ? "Uploading Media..." : "Update Product"}
                </Button>
                <Button variant="outline" onClick={cancelEdit}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>}

        {/* Tabs for Products and Orders */}
        <div className="flex gap-4 mb-6">
          <Button variant={activeTab === "products" ? "default" : "outline"} onClick={() => setActiveTab("products")}>
            Products
          </Button>
          <Button variant={activeTab === "pending" ? "default" : "outline"} onClick={() => setActiveTab("pending")}>
            Pending Orders ({pendingOrders.length})
          </Button>
          <Button variant={activeTab === "orders" ? "default" : "outline"} onClick={() => setActiveTab("orders")}>
            All Orders ({receivedOrders.length})
          </Button>
        </div>

        {/* Products List */}
        {activeTab === "products" && <Card className="bg-card border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-foreground">Your Products</CardTitle>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <Input placeholder="Search products..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10 bg-[#F3F4F6] text-black border-none" />
                </div>
              </div>
            </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredProducts.map(product => <div key={product.id} className="border border-border rounded-lg p-4 bg-secondary/50">
                  <div className="flex items-start justify-between">
                    <div className="flex gap-4">
                      <Button 
                        variant="default" 
                        size="icon" 
                        className="flex-shrink-0 bg-primary hover:bg-primary/90"
                        onClick={() => startEditProduct(product)}
                        title="Edit Product"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <div className="w-20 h-20 bg-card rounded-lg flex items-center justify-center overflow-hidden">
                        {product.image_url ? (
                          <img 
                            src={product.image_url} 
                            alt={product.name} 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <ImageIcon className="h-8 w-8 text-muted-foreground" />
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-foreground">{product.name}</h3>
                          {product.product_code && <Badge variant="outline" className="bg-primary/5">{product.product_code}</Badge>}
                          <Badge variant={product.is_active ? "default" : "secondary"}>
                            {product.is_active ? "Active" : "Inactive"}
                          </Badge>
                          {product.image_urls && product.image_urls.length > 0 && <Badge variant="outline" className="text-xs">{product.image_urls.length} photos</Badge>}
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                          {product.description}
                        </p>
                        
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-foreground font-medium">₹{product.price}</span>
                          {product.original_price && <span className="text-muted-foreground line-through">₹{product.original_price}</span>}
                          <span className="text-green-500 font-medium">stock:{product.stock}</span>
                          <span className="text-muted-foreground">sold:{product.sold_count}</span>
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 text-neon-pink fill-current" />
                            <span>{Number(product.rating).toFixed(1)} ({product.review_count})</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => deleteProduct(product.id)} className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>)}
            </div>
          </CardContent>
        </Card>}

        {activeTab === "pending" && <Card className="bg-card border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-foreground">Pending Orders</CardTitle>
                {pendingOrders.length > 0 && <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Checkbox id="selectAll" checked={selectAllOrders} onCheckedChange={handleSelectAllOrders} />
                      <Label htmlFor="selectAll" className="text-sm">Select All</Label>
                    </div>
                    <Button className="bg-gradient-primary hover:shadow-glow-primary" onClick={handleBulkReadyForDelivery} disabled={selectedOrders.length === 0}>
                      Ready for Delivery ({selectedOrders.length})
                    </Button>
                  </div>}
              </div>
            </CardHeader>
            <CardContent>
              {pendingOrders.length === 0 ? <div className="text-center py-12">
                  <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No pending orders</p>
                </div> : <div className="space-y-4">
                  {pendingOrders.map(order => <div key={order.id} className="border border-border rounded-lg p-4 bg-secondary/50">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-start gap-3">
                          <Checkbox checked={selectedOrders.includes(order.id)} onCheckedChange={() => toggleOrderSelection(order.id)} />
                          <div>
                            <h3 className="font-semibold text-foreground">Order #{order.order_number}</h3>
                            <p className="text-sm text-muted-foreground">
                              {new Date(order.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                            </p>
                            <p className="text-sm font-medium text-neon-green mt-1">
                              Estimated Delivery: Est. {getEstimatedDelivery(order.created_at)}
                            </p>
                          </div>
                        </div>
                        <Badge className="bg-amber-500">
                          Pending
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                        <div>
                          <span className="text-muted-foreground">Customer:</span>
                          <p className="font-medium text-foreground">{order.customer_name || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Phone:</span>
                          <p className="font-medium text-foreground">{order.customer_phone || 'N/A'}</p>
                        </div>
                      </div>

                      <div className="space-y-2 mb-3">
                        <h4 className="text-sm font-semibold text-foreground">Items:</h4>
                        {order.items.map((item: OrderItem, idx: number) => <div key={idx} className="flex items-center gap-3 text-sm bg-card/50 p-2 rounded">
                            <div className="w-12 h-12 bg-secondary rounded overflow-hidden flex-shrink-0">
                              {item.image_url ? (
                                <img 
                                  src={item.image_url} 
                                  alt={item.product_name} 
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.onerror = null;
                                    target.src = "/placeholder.svg";
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <ImageIcon className="h-5 w-5 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="text-foreground font-medium">
                                <span>{item.product_name} x {item.quantity}</span>
                              </div>
                              {(item.size || item.color) && <span className="text-xs text-muted-foreground">
                                  ({item.size && `Size: ${item.size}`}{item.size && item.color && ', '}{item.color && `Color: ${item.color}`})
                                </span>}
                            </div>
                            <span className="font-medium">₹{item.price}</span>
                          </div>)}
                      </div>

                      <div className="border-t border-border pt-3 mb-3">
                        <div className="flex justify-between font-bold">
                          <span>Total Amount:</span>
                          <span className="text-neon-green">₹{order.total_amount}</span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button className="flex-1 bg-gradient-primary hover:shadow-glow-primary" onClick={e => {
                  e.stopPropagation();
                  handleReadyForDelivery(order.id);
                }}>
                          Order is Ready for Delivery
                        </Button>
                        <Button variant="outline" size="icon" onClick={e => {
                  e.stopPropagation();
                  handlePrintOrder(order);
                }}>
                          <Printer className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>)}
                </div>}
            </CardContent>
          </Card>}

        {/* Orders List */}
        {activeTab === "orders" && <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">All Orders</CardTitle>
            </CardHeader>
            <CardContent>
              {receivedOrders.length === 0 ? <div className="text-center py-12">
                  <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No orders received yet</p>
                </div> : <div className="space-y-4">
                  {receivedOrders.map(order => <div key={order.id} className="border border-border rounded-lg p-4 bg-secondary/50">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-semibold text-foreground">Order #{order.order_number}</h3>
                          <p className="text-sm text-muted-foreground">
                            {new Date(order.created_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                          </p>
                        </div>
                        <Badge className={order.status === 'delivered' ? 'bg-green-500' : order.status === 'received' ? 'bg-teal-500' : order.status === 'shipped' ? 'bg-blue-500' : order.status === 'cancelled' ? 'bg-red-500' : 'bg-yellow-500'}>
                          {order.status}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                        <div>
                          <span className="text-muted-foreground">Customer:</span>
                          <p className="font-medium text-foreground">{(order as any).customer_name || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Phone:</span>
                          <p className="font-medium text-foreground">{(order as any).customer_phone || 'N/A'}</p>
                        </div>
                      </div>

                      <div className="space-y-2 mb-3">
                        <h4 className="text-sm font-semibold text-foreground">Items:</h4>
                        {order.items.map((item: OrderItem, idx: number) => <div key={idx} className="flex items-center gap-3 text-sm bg-card/50 p-2 rounded">
                            <div className="w-12 h-12 bg-secondary rounded overflow-hidden flex-shrink-0">
                              {item.image_url ? (
                                <img 
                                  src={item.image_url} 
                                  alt={item.product_name} 
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.onerror = null;
                                    target.src = "/placeholder.svg";
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <ImageIcon className="h-5 w-5 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="text-foreground font-medium">
                                <span>{item.product_name} x {item.quantity}</span>
                              </div>
                              {(item.size || item.color) && <span className="text-xs text-muted-foreground">
                                  ({item.size && `Size: ${item.size}`}{item.size && item.color && ', '}{item.color && `Color: ${item.color}`})
                                </span>}
                            </div>
                            <span className="font-medium">₹{item.price}</span>
                          </div>)}
                      </div>

                      <div className="border-t border-border pt-3 mb-3">
                        <div className="flex justify-between mb-2">
                          <span className="text-sm text-muted-foreground">Delivery Address:</span>
                          <span className="text-sm text-foreground text-right">{order.delivery_address}</span>
                        </div>
                        <div className="flex justify-between font-bold">
                          <span>Total Amount:</span>
                          <span className="text-neon-green">₹{order.total_amount}</span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1" onClick={e => {
                  e.stopPropagation();
                  handlePrintOrder(order);
                }}>
                          <Printer className="h-4 w-4 mr-2" />
                          Print Label
                        </Button>
                      </div>
                    </div>)}
                </div>}
            </CardContent>
          </Card>}
      </div>
    </div>;
};