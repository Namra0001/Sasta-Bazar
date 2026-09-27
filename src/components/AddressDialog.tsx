import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Navigation } from "lucide-react";
import { useLoadScript, GoogleMap, Marker } from "@react-google-maps/api";

interface AddressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddressDialog = ({ open, onOpenChange }: AddressDialogProps) => {
  const [address, setAddress] = useState({
    full_address: "",
    city: "",
    state: "",
    pincode: "",
  });
  const [addressRowId, setAddressRowId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [mapCenter, setMapCenter] = useState({ lat: 21.1702, lng: 72.8311 });
  const [markerPos, setMarkerPos] = useState<google.maps.LatLngLiteral | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    language: "en",
  });

  useEffect(() => {
    if (open) {
      void fetchAddress();
    } else {
      setShowMap(false);
      setMarkerPos(null);
    }
  }, [open]);

  const fetchAddress = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const signupAddress =
        typeof user.user_metadata?.address === "string" ? user.user_metadata.address.trim() : "";

      const { data, error } = await supabase
        .from("addresses")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        setAddressRowId(data.id);
        setAddress({
          full_address: data.full_address ?? "",
          city: data.city ?? "",
          state: data.state ?? "",
          pincode: data.pincode ?? "",
        });
      } else {
        setAddressRowId(null);
        setAddress({
          full_address: signupAddress,
          city: "",
          state: "",
          pincode: "",
        });
      }
    } catch (error: unknown) {
      console.error("Error fetching address:", error);
      const message = error instanceof Error ? error.message : "Could not load address";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    }
  };

  const reverseGeocode = async (pos: google.maps.LatLngLiteral) => {
    const fallbackGeocode = async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.lat}&lon=${pos.lng}&accept-language=en`);
        const data = await res.json();
        if (data && data.address) {
          setAddress({
            full_address: data.display_name || "",
            city: data.address.city || data.address.town || data.address.village || data.address.state_district || "",
            state: data.address.state || "",
            pincode: data.address.postcode || "",
          });
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

          setAddress({
            full_address: results[0].formatted_address,
            city: city,
            state: state,
            pincode: pincode,
          });
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
        reverseGeocode(pos);
      },
      (error) => {
        let msg = "Could not fetch precise location";
        if (error.code === error.PERMISSION_DENIED) msg = "Location permission denied. Trying approximate location...";
        else if (error.code === error.POSITION_UNAVAILABLE) msg = "Precise location unavailable. Trying approximate location...";
        else if (error.code === error.TIMEOUT) msg = "Precise location timed out. Trying approximate location...";
        
        toast({ title: "Notice", description: msg });

        // Fallback to IP-based location
        fetch('https://ipapi.co/json/')
          .then(res => res.json())
          .then(data => {
            if (data.latitude && data.longitude) {
              const pos = { lat: data.latitude, lng: data.longitude };
              setMapCenter(pos);
              setMarkerPos(pos);
              setShowMap(true);
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

  const handleSave = async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "Please log in to save your address",
          variant: "destructive",
        });
        return;
      }

      const payload = {
        full_address: address.full_address.trim(),
        city: address.city.trim() || null,
        state: address.state.trim() || null,
        pincode: address.pincode.trim() || null,
      };

      if (!payload.full_address) {
        toast({
          title: "Required",
          description: "Please enter a full address.",
          variant: "destructive",
        });
        return;
      }

      if (addressRowId) {
        const { error } = await supabase
          .from("addresses")
          .update(payload)
          .eq("id", addressRowId)
          .eq("user_id", user.id);

        if (error) throw error;
      } else {
        const { data: inserted, error } = await supabase
          .from("addresses")
          .insert({
            ...payload,
            user_id: user.id,
            is_default: true,
          })
          .select("id")
          .maybeSingle();

        if (error) throw error;
        if (inserted?.id) setAddressRowId(inserted.id);
      }

      toast({
        title: "Success",
        description: "Address saved successfully",
      });
      onOpenChange(false);
    } catch (error: unknown) {
      console.error("Error saving address:", error);
      const message =
        error && typeof error === "object" && "message" in error
          ? String((error as { message: string }).message)
          : "Failed to save address";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            {addressRowId ? "Edit Address" : "Add Address"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto px-1">
          <Button 
            type="button" 
            variant="outline" 
            className="w-full border-dashed" 
            onClick={handleLiveLocation}
            disabled={gettingLocation}
          >
            <Navigation className="mr-2 h-4 w-4" />
            {gettingLocation ? "Fetching location..." : "Use Live Location"}
          </Button>

          {showMap && isLoaded && (
            <div className="w-full h-[250px] rounded-md overflow-hidden mb-4 border border-border relative">
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

          <div className="space-y-2">
            <Label htmlFor="full_address" className="text-black font-semibold">Full Address *</Label>
            <Input
              id="full_address"
              value={address.full_address}
              onChange={(e) =>
                setAddress({ ...address, full_address: e.target.value })
              }
              placeholder="House no., Street, Area"
              className="w-full py-6 px-4 border-none bg-[#c9d1d96e] rounded-xl text-black text-base focus-visible:ring-1 focus-visible:ring-[#F97316] placeholder:text-gray-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city" className="text-black font-semibold">City</Label>
              <Input
                id="city"
                value={address.city}
                onChange={(e) =>
                  setAddress({ ...address, city: e.target.value })
                }
                placeholder="City"
                className="w-full py-6 px-4 border-none bg-[#c9d1d96e] rounded-xl text-black text-base focus-visible:ring-1 focus-visible:ring-[#F97316] placeholder:text-gray-400"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="state" className="text-black font-semibold">State</Label>
              <Input
                id="state"
                value={address.state}
                onChange={(e) =>
                  setAddress({ ...address, state: e.target.value })
                }
                placeholder="State"
                className="w-full py-6 px-4 border-none bg-[#c9d1d96e] rounded-xl text-black text-base focus-visible:ring-1 focus-visible:ring-[#F97316] placeholder:text-gray-400"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pincode" className="text-black font-semibold">Pincode</Label>
            <Input
              id="pincode"
              value={address.pincode}
              onChange={(e) =>
                setAddress({ ...address, pincode: e.target.value })
              }
              placeholder="Pincode"
              className="w-full py-6 px-4 border-none bg-[#c9d1d96e] rounded-xl text-black text-base focus-visible:ring-1 focus-visible:ring-[#F97316] placeholder:text-gray-400"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void handleSave()} disabled={loading || !address.full_address.trim()}>
            {loading ? "Saving..." : "Save Address"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
