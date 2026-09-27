import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import { 
  Truck, 
  Package, 
  CheckCircle, 
  Clock, 
  MapPin,
  Phone,
  User,
  ArrowLeft
} from "lucide-react";

interface OrderItem {
  product_id: string;
  product_name: string;
  price: number;
  quantity: number;
}

interface Order {
  id: string;
  order_number: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  delivery_address: string;
  items: OrderItem[];
  total_amount: number;
  status: string;
  created_at: string;
}

export const DeliveryPage = () => {
  const [searchParams] = useSearchParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchOrder = async () => {
      const orderId = searchParams.get('orderId');
      if (!orderId) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .single();

        if (error) throw error;
        setOrder({
          ...data,
          items: data.items as unknown as OrderItem[]
        });
      } catch (error) {
        console.error('Error fetching order:', error);
        toast({
          title: "Error",
          description: "Failed to fetch order details",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrder();
  }, [searchParams, toast]);

  const handleMarkAsReceived = async () => {
    if (!order) return;

    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'received' })
        .eq('id', order.id);

      if (error) throw error;

      toast({
        title: "Order Marked as Received",
        description: "Order has been marked as received successfully",
      });

      navigate('/seller');
    } catch (error) {
      console.error('Error updating order:', error);
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive"
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending": return <Clock className="h-5 w-5 text-neon-blue" />;
      case "picked": return <Package className="h-5 w-5 text-neon-purple" />;
      case "in_transit": return <Truck className="h-5 w-5 text-neon-pink" />;
      case "delivered": return <CheckCircle className="h-5 w-5 text-neon-green" />;
      default: return <Clock className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-neon-blue";
      case "picked": return "bg-neon-purple";
      case "in_transit": return "bg-neon-pink";
      case "delivered": return "bg-neon-green";
      default: return "bg-muted";
    }
  };

  const formatStatus = (status: string) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <Button variant="outline" onClick={() => navigate('/seller')} className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Seller Dashboard
          </Button>
          <Card>
            <CardContent className="p-12 text-center">
              <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-2xl font-bold mb-2">No Order Selected</h2>
              <p className="text-muted-foreground">Please select an order from the seller dashboard</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <Button variant="outline" onClick={() => navigate('/seller')} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Seller Dashboard
        </Button>

        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-foreground">Order Details</CardTitle>
              <Badge className={getStatusColor(order.status)}>
                {formatStatus(order.status)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Order Info */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <h3 className="font-semibold text-foreground">Order Information</h3>
                <div className="text-sm space-y-1">
                  <p><span className="text-muted-foreground">Order ID:</span> {order.order_number}</p>
                  <p><span className="text-muted-foreground">Order Date:</span> {new Date(order.created_at).toLocaleDateString()}</p>
                  <p><span className="text-muted-foreground">Status:</span> {order.status}</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Customer Info */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Customer Information
                </h3>
                <div className="space-y-2 text-sm">
                  <p><span className="text-muted-foreground">Name:</span> {order.customer_name || 'N/A'}</p>
                  <p><span className="text-muted-foreground">Phone:</span> {order.customer_phone || 'N/A'}</p>
                  <p><span className="text-muted-foreground">Email:</span> {order.customer_email || 'N/A'}</p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Delivery Address
                </h3>
                <div className="text-sm">
                  <p className="text-foreground">{order.delivery_address}</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Order Items */}
            <div>
              <h3 className="font-semibold text-foreground mb-4">Order Items</h3>
              <div className="space-y-3">
                {order.items.map((item, index) => (
                  <div key={index} className="flex justify-between items-center bg-secondary/50 p-3 rounded-lg">
                    <div>
                      <p className="font-medium text-foreground">{item.product_name}</p>
                      <p className="text-sm text-muted-foreground">Quantity: {item.quantity}</p>
                    </div>
                    <p className="font-medium text-foreground">₹{item.price}</p>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center mt-4 pt-4 border-t border-border">
                <span className="font-semibold text-foreground">Total Amount:</span>
                <span className="font-bold text-lg text-foreground">₹{order.total_amount}</span>
              </div>
            </div>

            <Separator />

            {/* Actions */}
            {order.status === 'pending' && (
              <div className="flex gap-4">
                <Button 
                  onClick={handleMarkAsReceived}
                  className="flex-1 bg-primary hover:bg-primary/90"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark as Received
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};