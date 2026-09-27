import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2, Upload, Store } from "lucide-react";
import { toast } from "sonner";

interface SellerProfile {
  business_name: string;
  business_description: string;
  store_logo_url: string;
  business_address: string;
  business_phone: string;
  business_email: string;
  website_url: string;
  facebook_url: string;
  instagram_url: string;
  twitter_url: string;
  live_location_url: string;
}

export const SellerProfile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState<SellerProfile>({
    business_name: "",
    business_description: "",
    store_logo_url: "",
    business_address: "",
    business_phone: "",
    business_email: "",
    website_url: "",
    facebook_url: "",
    instagram_url: "",
    twitter_url: "",
    live_location_url: "",
  });

  useEffect(() => {
    checkSellerRole();
  }, []);

  const checkSellerRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate("/seller/auth");
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
      if (user.email !== 'namradabhi0001@gmail.com') {
        navigate("/seller/auth");
        return;
      }
    } else if (!roleData && user.email !== 'namradabhi0001@gmail.com') {
      navigate("/seller/auth");
      return;
    }

    await fetchProfile(user.id);
  };

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("seller_profiles")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (data) {
        setProfile({
          business_name: data.business_name || "",
          business_description: data.business_description || "",
          store_logo_url: data.store_logo_url || "",
          business_address: data.business_address || "",
          business_phone: data.business_phone || "",
          business_email: data.business_email || "",
          website_url: data.website_url || "",
          facebook_url: data.facebook_url || "",
          instagram_url: data.instagram_url || "",
          twitter_url: data.twitter_url || "",
          live_location_url: (data.business_hours as any)?.live_location_url || "",
        });
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("product-images")
        .getPublicUrl(fileName);

      setProfile({ ...profile, store_logo_url: urlData.publicUrl });
      toast.success("Logo uploaded successfully");
    } catch (error) {
      console.error("Error uploading logo:", error);
      toast.error("Failed to upload logo");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("seller_profiles")
        .upsert({
          user_id: user.id,
          ...profile,
          business_hours: { live_location_url: profile.live_location_url },
          live_location_url: undefined, // Don't send this custom field directly
        }, { onConflict: "user_id" });

      if (error) throw error;

      toast.success("Profile saved successfully");
    } catch (error: any) {
      console.error("Error saving profile:", error);
      toast.error(`Failed to save profile: ${error?.message || "Unknown error"}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate("/seller")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Store className="h-8 w-8" />
            Seller Profile
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage your business information and store branding
          </p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Store Branding</CardTitle>
              <CardDescription>Upload your store logo and brand identity</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Store Logo</Label>
                <div className="mt-2 flex items-center gap-4">
                  {profile.store_logo_url && (
                    <img
                      src={profile.store_logo_url}
                      alt="Store logo"
                      className="h-20 w-20 rounded-lg object-cover border"
                      onError={(e) => { e.currentTarget.src = "/placeholder.svg"; e.currentTarget.onerror = null; }}
                    />
                  )}
                  <div>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      disabled={uploading}
                      className="max-w-xs"
                    />
                    {uploading && <p className="text-sm text-muted-foreground mt-1">Uploading...</p>}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Business Information</CardTitle>
              <CardDescription>Basic details about your business</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="business_name">Business Name</Label>
                <Input
                  id="business_name"
                  value={profile.business_name}
                  onChange={(e) => setProfile({ ...profile, business_name: e.target.value })}
                  placeholder="Your Business Name"
                />
              </div>

              <div>
                <Label htmlFor="business_description">Business Description</Label>
                <Textarea
                  id="business_description"
                  value={profile.business_description}
                  onChange={(e) => setProfile({ ...profile, business_description: e.target.value })}
                  placeholder="Describe your business..."
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="business_address">Business Address</Label>
                <Textarea
                  id="business_address"
                  value={profile.business_address}
                  onChange={(e) => setProfile({ ...profile, business_address: e.target.value })}
                  placeholder="Your business address"
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="live_location_url">Google Maps Location Link</Label>
                <Input
                  id="live_location_url"
                  value={profile.live_location_url}
                  onChange={(e) => setProfile({ ...profile, live_location_url: e.target.value })}
                  placeholder="https://maps.app.goo.gl/..."
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
              <CardDescription>How customers can reach you</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="business_phone">Business Phone</Label>
                <Input
                  id="business_phone"
                  value={profile.business_phone}
                  onChange={(e) => setProfile({ ...profile, business_phone: e.target.value })}
                  placeholder="+1 (555) 123-4567"
                />
              </div>

              <div>
                <Label htmlFor="business_email">Business Email</Label>
                <Input
                  id="business_email"
                  type="email"
                  value={profile.business_email}
                  onChange={(e) => setProfile({ ...profile, business_email: e.target.value })}
                  placeholder="business@example.com"
                />
              </div>

              <div>
                <Label htmlFor="website_url">Website URL</Label>
                <Input
                  id="website_url"
                  value={profile.website_url}
                  onChange={(e) => setProfile({ ...profile, website_url: e.target.value })}
                  placeholder="https://yourwebsite.com"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Social Media</CardTitle>
              <CardDescription>Connect your social media profiles</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="facebook_url">Facebook</Label>
                <Input
                  id="facebook_url"
                  value={profile.facebook_url}
                  onChange={(e) => setProfile({ ...profile, facebook_url: e.target.value })}
                  placeholder="https://facebook.com/yourpage"
                />
              </div>

              <div>
                <Label htmlFor="instagram_url">Instagram</Label>
                <Input
                  id="instagram_url"
                  value={profile.instagram_url}
                  onChange={(e) => setProfile({ ...profile, instagram_url: e.target.value })}
                  placeholder="https://instagram.com/yourprofile"
                />
              </div>

              <div>
                <Label htmlFor="twitter_url">Twitter</Label>
                <Input
                  id="twitter_url"
                  value={profile.twitter_url}
                  onChange={(e) => setProfile({ ...profile, twitter_url: e.target.value })}
                  placeholder="https://twitter.com/yourhandle"
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Profile"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};