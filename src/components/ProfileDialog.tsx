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
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { User, Package, LogOut, Star, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AddressDialog } from "./AddressDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLogout: () => void;
}

interface Order {
  id: string;
  order_number: string;
  items: any;
  total_amount: number;
  status: string;
  created_at: string;
  delivered_at: string | null;
}

interface Profile {
  full_name: string;
  mobile_no: string;
  email: string;
}

export const ProfileDialog = ({ open, onOpenChange, onLogout }: ProfileDialogProps) => {
  const [profile, setProfile] = useState<Profile>({
    full_name: "",
    mobile_no: "",
    email: "",
  });
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [feedback, setFeedback] = useState({ rating: 5, feedback_text: "" });
  const [loading, setLoading] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);
  const [addressOpen, setAddressOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const profileFromUserMetadata = (user: { email?: string | null; user_metadata?: Record<string, unknown> }) => {
    const meta = user.user_metadata || {};
    const fullName =
      (typeof meta.full_name === "string" ? meta.full_name : "") ||
      (typeof meta.name === "string" ? meta.name : "");
    const mobile =
      (typeof meta.mobile === "string" ? meta.mobile : "") ||
      (typeof meta.mobile_no === "string" ? meta.mobile_no : "");
    return {
      full_name: fullName,
      mobile_no: mobile,
      email: user.email || "",
    };
  };

  useEffect(() => {
    if (open) {
      fetchProfile();
      fetchOrders();
    }
  }, [open]);

  const fetchProfile = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const fromSignup = profileFromUserMetadata(user);

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching profile:", error);
        const msg = String(error.message || "");
        setProfile({
          full_name: fromSignup.full_name,
          mobile_no: fromSignup.mobile_no,
          email: fromSignup.email || user.email || "",
        });
        setHasProfile(false);
        if (msg.includes("schema cache") || msg.toLowerCase().includes("does not exist")) {
          toast({
            title: "Database tables missing",
            description:
              "Open Supabase → SQL Editor, paste and run the file supabase/migrations/20260203120000_ensure_profiles_and_addresses.sql from your project.",
            variant: "destructive",
          });
        }
        return;
      }

      if (data) {
        setProfile({
          full_name: data.full_name?.trim() || fromSignup.full_name,
          mobile_no: data.mobile_no?.trim() || fromSignup.mobile_no,
          email: data.email?.trim() || fromSignup.email || user.email || "",
        });
        setHasProfile(true);
      } else {
        setProfile({
          full_name: fromSignup.full_name,
          mobile_no: fromSignup.mobile_no,
          email: fromSignup.email || user.email || "",
        });
        setHasProfile(false);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  };

  const fetchOrders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error("Error fetching orders:", error);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("profiles")
        .upsert({
          user_id: user.id,
          full_name: profile.full_name,
          mobile_no: profile.mobile_no,
          email: profile.email,
        });

      if (error) throw error;

      setHasProfile(true);
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    } catch (error) {
      console.error("Error saving profile:", error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitFeedback = async (orderId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("order_feedback")
        .upsert({
          order_id: orderId,
          user_id: user.id,
          rating: feedback.rating,
          feedback_text: feedback.feedback_text,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Feedback submitted successfully",
      });
      setSelectedOrder(null);
      setFeedback({ rating: 5, feedback_text: "" });
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast({
        title: "Error",
        description: "Failed to submit feedback",
        variant: "destructive",
      });
    }
  };

  const confirmLogout = async () => {
    setLogoutConfirmOpen(false);
    await supabase.auth.signOut();
    onLogout();
    onOpenChange(false);
    navigate("/");
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Profile Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name" className="text-black font-semibold">Full Name</Label>
                <Input
                  id="full_name"
                  value={profile.full_name}
                  onChange={(e) =>
                    setProfile({ ...profile, full_name: e.target.value })
                  }
                  placeholder="Enter your full name"
                  className="w-full py-6 px-4 border-none bg-[#c9d1d96e] rounded-xl text-black text-base focus-visible:ring-1 focus-visible:ring-[#F97316] placeholder:text-gray-400"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mobile_no" className="text-black font-semibold">Mobile Number</Label>
                <Input
                  id="mobile_no"
                  value={profile.mobile_no}
                  onChange={(e) =>
                    setProfile({ ...profile, mobile_no: e.target.value })
                  }
                  placeholder="Enter your mobile number"
                  className="w-full py-6 px-4 border-none bg-[#c9d1d96e] rounded-xl text-black text-base focus-visible:ring-1 focus-visible:ring-[#F97316] placeholder:text-gray-400"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-black font-semibold">Email</Label>
                <Input
                  id="email"
                  value={profile.email}
                  onChange={(e) =>
                    setProfile({ ...profile, email: e.target.value })
                  }
                  placeholder="Enter your email"
                  className="w-full py-6 px-4 border-none bg-[#c9d1d96e] rounded-xl text-black text-base focus-visible:ring-1 focus-visible:ring-[#F97316] placeholder:text-gray-400"
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSaveProfile} disabled={loading}>
                  {loading ? "Saving..." : hasProfile ? "Update Profile" : "Save Profile"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setAddressOpen(true)}
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  Manage Address
                </Button>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Order History */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Package className="h-5 w-5" />
              Order History
            </h3>

            {orders.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No orders yet
              </p>
            ) : (
              <div className="space-y-3">
                {orders.map((order) => (
                  <Card key={order.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-semibold">{order.order_number}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(order.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge
                          variant={
                            order.status === "delivered"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {order.status}
                        </Badge>
                      </div>

                      <p className="text-sm font-medium mb-2">
                        Total: ₹{order.total_amount}
                      </p>

                      {order.status === "delivered" && (
                        <div className="mt-3 pt-3 border-t">
                          {selectedOrder === order.id ? (
                            <div className="space-y-3">
                              <div className="flex items-center gap-1">
                                <Label>Rating:</Label>
                                <div className="flex gap-1">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                      key={star}
                                      className={`h-5 w-5 cursor-pointer ${
                                        star <= feedback.rating
                                          ? "fill-yellow-400 text-yellow-400"
                                          : "text-gray-300"
                                      }`}
                                      onClick={() =>
                                        setFeedback({ ...feedback, rating: star })
                                      }
                                    />
                                  ))}
                                </div>
                              </div>

                              <Textarea
                                placeholder="Share your feedback..."
                                value={feedback.feedback_text}
                                onChange={(e) =>
                                  setFeedback({
                                    ...feedback,
                                    feedback_text: e.target.value,
                                  })
                                }
                                rows={3}
                              />

                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleSubmitFeedback(order.id)}
                                >
                                  Submit Feedback
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setSelectedOrder(null)}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedOrder(order.id)}
                            >
                              Leave Feedback
                            </Button>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Logout Button */}
          <Button
            variant="destructive"
            className="w-full"
            onClick={() => setLogoutConfirmOpen(true)}
          >
            <LogOut className="h-5 w-5 mr-2" />
            Logout
          </Button>
        </div>
      </DialogContent>
      <AddressDialog open={addressOpen} onOpenChange={setAddressOpen} />
    </Dialog>

    <AlertDialog open={logoutConfirmOpen} onOpenChange={setLogoutConfirmOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Log out?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to log out? You will need to sign in again to access your account.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => void confirmLogout()}>
            Yes, log out
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>
  );
};
