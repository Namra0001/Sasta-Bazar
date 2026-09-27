import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { MapPin, Navigation } from "lucide-react";
import { useLoadScript, GoogleMap, Marker } from "@react-google-maps/api";

interface CheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  productName: string;
  productPrice: number;
  quantity?: number;
  size?: string;
  color?: string;
  imageUrl?: string;
  onOrderSuccess?: () => void;
}

export const CheckoutDialog = ({ open, onOpenChange, productId, productName, productPrice, quantity = 1, size, color, imageUrl, onOrderSuccess }: CheckoutDialogProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    pincode: "",
    state: ""
  });

  const [mapCenter, setMapCenter] = useState({ lat: 21.1702, lng: 72.8311 });
  const [markerPos, setMarkerPos] = useState<google.maps.LatLngLiteral | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [isLocationAdded, setIsLocationAdded] = useState(false);

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    language: "en",
  });

  useEffect(() => {
    if (open) {
      const fetchUserData = async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle();

          const { data: address } = await supabase
            .from("addresses")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          setFormData(prev => ({
            ...prev,
            fullName: profile?.full_name || prev.fullName,
            phone: profile?.mobile_no || prev.phone,
            email: profile?.email || user.email || prev.email,
            address: address?.full_address || prev.address,
            city: address?.city || prev.city,
            state: address?.state || prev.state,
            pincode: address?.pincode || prev.pincode
          }));
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      };
      
      fetchUserData();
    } else {
      setShowMap(false);
      setMarkerPos(null);
      setIsLocationAdded(false);
    }
  }, [open]);

  const reverseGeocode = async (pos: google.maps.LatLngLiteral) => {
    const fallbackGeocode = async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.lat}&lon=${pos.lng}&accept-language=en`);
        const data = await res.json();
        if (data && data.address) {
          setFormData(prev => ({
            ...prev,
            address: data.display_name || "",
            city: data.address.city || data.address.town || data.address.village || data.address.state_district || "",
            state: data.address.state || "",
            pincode: data.address.postcode || "",
          }));
        }
      } catch (osmError) {
        console.error("OSM Fallback failed", osmError);
        toast({ title: "Error", description: "Could not fetch address details for this location.", variant: "destructive" });
      }
    };

    try {
      if (!window.google) {
        await fallbackGeocode();
        return;
      }
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ location: pos }, (results, status) => {
        if (status === "OK" && results && results[0]) {
          const addressComponents = results[0].address_components;
          let city = "";
          let state = "";
          let pincode = "";

          for (const component of addressComponents) {
            const types = component.types;
            if (types.includes("locality")) {
              city = component.long_name;
            } else if (!city && types.includes("administrative_area_level_2")) {
              city = component.long_name;
            } else if (!city && types.includes("administrative_area_level_3")) {
              city = component.long_name;
            }
            if (types.includes("administrative_area_level_1")) state = component.long_name;
            if (types.includes("postal_code")) pincode = component.long_name;
          }

          setFormData(prev => ({
            ...prev,
            address: results[0].formatted_address,
            city: city,
            state: state,
            pincode: pincode,
          }));
        } else {
          void fallbackGeocode();
        }
      });
    } catch (error) {
      console.error("Geocoding failed", error);
      void fallbackGeocode();
    }
  };

  const handleLiveLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: "Error", description: "Geolocation is not supported by your browser", variant: "destructive" });
      return;
    }
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const pos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setMapCenter(pos);
        setMarkerPos(pos);
        setShowMap(true);
        setGettingLocation(false);
        setIsLocationAdded(true);
        reverseGeocode(pos);
      },
      (error) => {
        let msg = "Could not fetch precise location";
        if (error.code === error.PERMISSION_DENIED) msg = "Location permission denied. Trying approximate location...";
        else if (error.code === error.POSITION_UNAVAILABLE) msg = "Precise location unavailable. Trying approximate location...";
        else if (error.code === error.TIMEOUT) msg = "Precise location timed out. Trying approximate location...";
        
        toast({ title: "Notice", description: msg });

        fetch('https://ipapi.co/json/')
          .then(res => res.json())
          .then(data => {
            if (data.latitude && data.longitude) {
              const pos = { lat: data.latitude, lng: data.longitude };
              setMapCenter(pos);
              setMarkerPos(pos);
              setShowMap(true);
              setIsLocationAdded(true);
              reverseGeocode(pos);
              toast({ title: "Success", description: "Fetched approximate location." });
            } else {
              toast({ title: "Error", description: "Could not fetch approximate location.", variant: "destructive" });
            }
          })
          .catch((err) => {
            console.error("IP location error:", err);
            toast({ title: "Error", description: "Failed to fetch any location automatically.", variant: "destructive" });
          })
          .finally(() => {
            setGettingLocation(false);
          });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const onMarkerDragEnd = (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const newPos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
      setMarkerPos(newPos);
      reverseGeocode(newPos);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.fullName || !formData.phone || !formData.address || !formData.city || !formData.pincode) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    if (!isLocationAdded) {
      toast({
        title: "Live Location Required",
        description: "Please click 'Add Live Address' to fetch your current location.",
        variant: "destructive"
      });
      return;
    }

    // Phone validation
    if (formData.phone.length !== 10 || !/^\d+$/.test(formData.phone)) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid 10-digit phone number",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please login to place an order",
          variant: "destructive"
        });
        return;
      }

      // Generate order number
      const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      // Prepare delivery address
      const deliveryAddress = `${formData.address}, ${formData.city}, ${formData.state || ''} - ${formData.pincode}`;

      // Create order in database with customer details
      const { error } = await supabase.from('orders').insert({
        user_id: user.id,
        order_number: orderNumber,
        customer_name: formData.fullName,
        customer_phone: formData.phone,
        customer_email: formData.email || null,
        items: [{
          product_id: productId,
          product_name: productName,
          price: productPrice / quantity,
          quantity: quantity,
          size: size || null,
          color: color || null,
          image_url: imageUrl || null
        }],
        total_amount: productPrice,
        delivery_address: deliveryAddress,
        status: 'pending'
      });

      if (error) throw error;

      // Update product stock and sold_count
      const { data: currentProduct } = await supabase.from('products').select('stock, sold_count').eq('id', productId).single();
      if (currentProduct) {
        await supabase.from('products').update({
          stock: Math.max(0, (currentProduct.stock || 0) - quantity),
          sold_count: (currentProduct.sold_count || 0) + quantity
        }).eq('id', productId);
      }

      // Show success message
      toast({
        title: "Order Placed Successfully! 🎉",
        description: `Order ${orderNumber} has been placed. Track your order from Orders page.`,
      });

      // Reset form and close dialog
      setFormData({
        fullName: "",
        phone: "",
        email: "",
        address: "",
        city: "",
        pincode: "",
        state: ""
      });
      setIsLocationAdded(false);
      setShowMap(false);
      setMarkerPos(null);
      
      onOrderSuccess?.();
      onOpenChange(false);
      
      // Navigate to orders page
      setTimeout(() => navigate('/orders'), 500);
    } catch (error: any) {
      console.error('Error placing order:', error);
      toast({
        title: "Order Failed",
        description: error.message || "Failed to place order. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Complete Your Order</DialogTitle>
          <DialogDescription>
            Enter your delivery details for {productName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name *</Label>
            <Input
              id="fullName"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              placeholder="Enter your full name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number *</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="10-digit mobile number"
              maxLength={10}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="your.email@example.com"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center pb-2">
              <Label htmlFor="address">Delivery Address *</Label>
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                className="border-dashed" 
                onClick={handleLiveLocation}
                disabled={gettingLocation}
              >
                <Navigation className="mr-2 h-4 w-4" />
                {gettingLocation ? "Fetching..." : "Add Live Address"}
              </Button>
            </div>
            
            {showMap && isLoaded && (
              <div className="w-full h-[200px] rounded-md overflow-hidden mb-4 border border-border relative">
                <GoogleMap
                  mapContainerStyle={{ width: "100%", height: "100%" }}
                  center={mapCenter}
                  zoom={15}
                  options={{ disableDefaultUI: true, zoomControl: true }}
                >
                  {markerPos && (
                    <Marker 
                      position={markerPos} 
                      draggable={true} 
                      onDragEnd={onMarkerDragEnd} 
                    />
                  )}
                </GoogleMap>
                <div className="absolute bottom-2 left-2 bg-white/90 px-2 py-1 text-xs rounded shadow z-10 font-medium text-slate-800">
                  Drag pin to adjust
                </div>
              </div>
            )}
            {!isLocationAdded && (
              <p className="text-xs text-red-500 mb-2">Live location is mandatory.</p>
            )}

            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="House no., Street, Area"
              required
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="City"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pincode">Pincode *</Label>
              <Input
                id="pincode"
                value={formData.pincode}
                onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                placeholder="6-digit pincode"
                maxLength={6}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="state">State</Label>
            <Input
              id="state"
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              placeholder="State"
            />
          </div>

          <div className="pt-4 border-t">
            <div className="flex justify-between items-center mb-4">
              <span className="text-lg font-semibold">Total Amount:</span>
              <span className="text-2xl font-bold text-primary">₹{productPrice}</span>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" className="bg-neon-green text-primary-foreground hover:bg-neon-green/90" disabled={isSubmitting}>
              {isSubmitting ? "Placing Order..." : "Place Order"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
