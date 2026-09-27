import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

/** Legacy route: email confirmation used to redirect here after link clicks. Sign-up now uses OTP on the home page. */
export const SignupConfirmation = () => {
  const [searchParams] = useSearchParams();
  const decision = (searchParams.get("decision") || "yes").toLowerCase();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        toast({
          title: "Verify with code",
          description: "Open the app, go to Sign Up, and enter the 6-digit code from your email.",
        });
        navigate("/");
        return;
      }

      if (decision === "yes") {
        toast({
          title: "Email verified",
          description: "You are signed in.",
        });
        navigate("/");
        return;
      }

      setLoading(false);
    };

    checkSession();
  }, [decision, navigate, toast]);

  const handleYes = async () => {
    navigate("/");
  };

  const handleNo = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Signed out",
      description: "You can sign up again if this was not you.",
    });
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Confirm Signup</CardTitle>
            <CardDescription>Checking your verification status...</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Was this your signup?</CardTitle>
          <CardDescription>Choose one option to continue.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button className="w-full" onClick={handleYes}>
            Yes, I am
          </Button>
          <Button className="w-full" variant="outline" onClick={handleNo}>
            No, I am not
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
