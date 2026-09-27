import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MapPin, Phone, Mail, User, Store, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export const DeliveryTracker = () => {
  const { id: orderId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<any>(null);
  const [sellerProfile, setSellerProfile] = useState<any>(null);

  useEffect(() => {
    if (!orderId) {
      toast.error("Invalid Order ID");
      navigate("/");
      return;
    }

    const fetchDeliveryDetails = async () => {
      try {
        const { data: orderData, error: orderError } = await supabase
          .from("orders")
          .select("*")
          .eq("id", orderId)
          .single();

        if (orderError) throw orderError;
        setOrder(orderData);

        if (orderData.seller_id) {
          const { data: sellerData, error: sellerError } = await supabase
            .from("seller_profiles")
            .select("*")
            .eq("user_id", orderData.seller_id)
            .single();

          if (sellerError && sellerError.code !== "PGRST116") {
            throw sellerError;
          }
          setSellerProfile(sellerData);
        }
      } catch (error) {
        console.error("Error fetching delivery details:", error);
        toast.error("Could not fetch delivery details");
      } finally {
        setLoading(false);
      }
    };

    fetchDeliveryDetails();
  }, [orderId, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <h1 className="text-2xl font-bold mb-4">Order not found</h1>
        <Button onClick={() => navigate("/")}>Return Home</Button>
      </div>
    );
  }

  const liveLocationUrl = sellerProfile?.business_hours?.live_location_url;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <h1 className="text-3xl font-bold text-center mb-8">Delivery Information</h1>

        {/* Buyer Information */}
        <Card className="border-t-4 border-t-primary shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <User className="h-6 w-6 text-primary" />
              Buyer Information
            </CardTitle>
            <CardDescription>Details for order delivery</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 font-medium">Name</p>
                <p className="font-semibold">{order.customer_name || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Phone</p>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <a href={`tel:${order.customer_phone}`} className="text-blue-600 hover:underline font-semibold">
                    {order.customer_phone || "N/A"}
                  </a>
                </div>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm text-gray-500 font-medium">Email</p>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <a href={`mailto:${order.customer_email}`} className="text-blue-600 hover:underline">
                    {order.customer_email || "N/A"}
                  </a>
                </div>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm text-gray-500 font-medium">Delivery Address</p>
                <div className="flex items-start gap-2 mt-1">
                  <MapPin className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <p className="bg-gray-100 p-3 rounded-lg flex-1 text-sm leading-relaxed">
                    {order.delivery_address || "No address provided"}
                  </p>
                </div>
                {order.delivery_address && (
                  <Button 
                    className="mt-3 w-full"
                    variant="outline"
                    onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(order.delivery_address)}`, '_blank')}
                  >
                    Open Buyer Address in Maps
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Seller Information */}
        <Card className="border-t-4 border-t-orange-500 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Store className="h-6 w-6 text-orange-500" />
              SastaBazar Hub Location
            </CardTitle>
            <CardDescription>Origin of this delivery</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {sellerProfile ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500 font-medium">Store Name</p>
                  <p className="font-semibold text-lg">{sellerProfile.business_name || "Sasta Bazar Hub"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Store Address</p>
                  <p className="bg-gray-100 p-3 rounded-lg text-sm mt-1">
                    {sellerProfile.business_address || "Not specified"}
                  </p>
                </div>
                {liveLocationUrl && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <Button 
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                      size="lg"
                      onClick={() => window.open(liveLocationUrl, '_blank')}
                    >
                      <MapPin className="mr-2 h-5 w-5" />
                      Get Live Location Route
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">No seller information available</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
