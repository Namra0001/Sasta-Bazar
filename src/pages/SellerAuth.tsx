import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Store, Loader2 } from "lucide-react";

const SELLER_EMAIL = "namradabhi0001@gmail.com";

export const SellerAuth = () => {
  const OTP_COOLDOWN_SECONDS = 90;
  const OTP_COOLDOWN_STORAGE_KEY = "seller_forgot_otp_next_allowed_at";
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingRole, setIsCheckingRole] = useState(true);
  const [loginPassword, setLoginPassword] = useState("");
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [forgotPasswordStep, setForgotPasswordStep] = useState<"email" | "otp" | "password">("email");
  const [forgotPasswordData, setForgotPasswordData] = useState({
    email: "",
    otp: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [isForgotLoading, setIsForgotLoading] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [forgotOtpSentToEmail, setForgotOtpSentToEmail] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Just set loading to false - don't auto-redirect
    // Seller must always login through this page
    setIsCheckingRole(false);
  }, []);

  useEffect(() => {
    const nextAllowedAtRaw = localStorage.getItem(OTP_COOLDOWN_STORAGE_KEY);
    if (!nextAllowedAtRaw) return;

    const nextAllowedAt = Number(nextAllowedAtRaw);
    const remainingSeconds = Math.max(0, Math.ceil((nextAllowedAt - Date.now()) / 1000));
    setOtpCooldown(remainingSeconds);
  }, []);

  useEffect(() => {
    if (otpCooldown <= 0) return;

    const timer = window.setInterval(() => {
      setOtpCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [otpCooldown]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: SELLER_EMAIL,
        password: loginPassword,
      });

      if (error) {
        // If user doesn't exist, sign them up as the seller
        if (error.message.includes("Invalid login credentials")) {
          const { data: signupData, error: signupError } = await supabase.auth.signUp({
            email: SELLER_EMAIL,
            password: loginPassword,
            options: {
              data: {
                full_name: "Namra Dabhi",
              },
            },
          });

          if (signupError) {
            const signupMessage = String(signupError?.message || "").toLowerCase();
            if (signupMessage.includes("user already registered")) {
              toast({
                title: "Invalid seller password",
                description:
                  "This seller account already exists. Please enter the correct password or use Forgot Password.",
                variant: "destructive",
              });
              return;
            }
            throw signupError;
          }

          if (signupData.user) {
            let userId = signupData.user.id;
            let session = signupData.session;

            if (!session) {
              const { data: loginAfterSignupData, error: loginAfterSignupError } =
                await supabase.auth.signInWithPassword({
                  email: SELLER_EMAIL,
                  password: loginPassword,
                });

              if (loginAfterSignupError) throw loginAfterSignupError;
              if (!loginAfterSignupData.user) {
                throw new Error("Unable to login seller account after signup.");
              }

              userId = loginAfterSignupData.user.id;
              session = loginAfterSignupData.session;
            }

            await supabase.from('profiles').upsert({
              user_id: userId,
              email: SELLER_EMAIL,
              full_name: "Namra Dabhi",
            });

            await supabase.from('user_roles').insert({
              user_id: userId,
              role: 'seller',
            });

            await supabase.from('products').update({
              seller_id: userId
            }).is('seller_id', null);

            toast({
              title: "Account created",
              description: "Welcome to your seller dashboard!",
            });
            navigate('/seller');
            return;
          }
        }
        throw error;
      }

      if (data.user) {
        // Check if user has seller role
        const { data: roles, error: rolesError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', data.user.id)
          .eq('role', 'seller')
          .limit(1)
          .maybeSingle();

        if (!roles) {
          // Assign seller role to this user
          await supabase.from('user_roles').insert({
            user_id: data.user.id,
            role: 'seller',
          });

          // Update all products to belong to this seller
          await supabase.from('products').update({
            seller_id: data.user.id
          }).is('seller_id', null);
        }

        toast({
          title: "Login successful",
          description: "Welcome to your seller dashboard!",
        });
        navigate('/seller');
      }
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForgotPasswordState = () => {
    setForgotPasswordStep("email");
    setForgotOtpSentToEmail("");
    setForgotPasswordData({
      email: "",
      otp: "",
      newPassword: "",
      confirmPassword: "",
    });
    setIsForgotLoading(false);
  };

  const handleSendOtp = async () => {
    const normalizedEmail = forgotPasswordData.email.trim().toLowerCase();

    if (!normalizedEmail) {
      toast({
        title: "Email required",
        description: "Please enter your registered seller email address.",
        variant: "destructive",
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    if (normalizedEmail !== SELLER_EMAIL) {
      toast({
        title: "Email not allowed",
        description: "Only the registered seller email can reset seller password.",
        variant: "destructive",
      });
      return;
    }

    if (otpCooldown > 0) {
      toast({
        title: "Please wait",
        description: `Try again in ${otpCooldown} seconds.`,
        variant: "destructive",
      });
      return;
    }

    setIsForgotLoading(true);
    try {
      setForgotPasswordData((prev) => ({ ...prev, email: normalizedEmail }));

      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: `${window.location.origin}/`,
      });

      if (error) throw error;

      setForgotOtpSentToEmail(normalizedEmail);
      setForgotPasswordData((prev) => ({ ...prev, email: normalizedEmail, otp: "" }));
      toast({
        title: "Code sent",
        description: `A reset code was sent to ${normalizedEmail}. Use only that password-reset code.`,
      });
      setOtpCooldown(OTP_COOLDOWN_SECONDS);
      localStorage.setItem(
        OTP_COOLDOWN_STORAGE_KEY,
        String(Date.now() + OTP_COOLDOWN_SECONDS * 1000)
      );
      setForgotPasswordStep("otp");
    } catch (error: any) {
      const message = String(error?.message || "");
      const lowerMessage = message.toLowerCase();
      const isRateLimitError =
        lowerMessage.includes("rate limit") ||
        lowerMessage.includes("too many requests") ||
        Number(error?.status || 0) === 429;

      toast({
        title: isRateLimitError ? "Too many emails sent" : "Failed to send reset email",
        description: isRateLimitError
          ? "Wait 15–60 minutes, then request a seller reset again. No reset email was sent just now — do not reuse a sign-up or other account code."
          : message.includes("User not found")
          ? "This email is not registered in database."
          : error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsForgotLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    const otp = forgotPasswordData.otp.trim();

    if (!otp) {
      toast({
        title: "Code required",
        description: "Please enter the code sent to your email.",
        variant: "destructive",
      });
      return;
    }

    if (!/^\d{6}$/.test(otp)) {
      toast({
        title: "Invalid code",
        description: "The code must be exactly 6 digits.",
        variant: "destructive",
      });
      return;
    }

    const recoveryEmail = (forgotOtpSentToEmail || forgotPasswordData.email).trim().toLowerCase();
    if (!recoveryEmail) {
      toast({
        title: "Request a code first",
        description: "Go back and send a reset code.",
        variant: "destructive",
      });
      return;
    }

    setIsForgotLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: recoveryEmail,
        token: otp,
        type: "recovery",
      });

      if (error) throw error;

      toast({
        title: "Code verified",
        description: "Now enter your new password.",
      });
      setForgotPasswordStep("password");
    } catch (error: any) {
      toast({
        title: "Invalid code",
        description: error.message || "Please check the code and try again.",
        variant: "destructive",
      });
    } finally {
      setIsForgotLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (forgotPasswordData.newPassword.length < 6) {
      toast({
        title: "Weak password",
        description: "Password must be at least 6 characters.",
        variant: "destructive",
      });
      return;
    }

    if (forgotPasswordData.newPassword !== forgotPasswordData.confirmPassword) {
      toast({
        title: "Password mismatch",
        description: "New password and confirm password must match.",
        variant: "destructive",
      });
      return;
    }

    setIsForgotLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: forgotPasswordData.newPassword,
      });

      if (error) throw error;

      toast({
        title: "Password updated",
        description: "You can now login with your new seller password.",
      });
      setIsForgotPasswordOpen(false);
      resetForgotPasswordState();
    } catch (error: any) {
      toast({
        title: "Password reset failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsForgotLoading(false);
    }
  };

  if (isCheckingRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Checking authorization...</p>
        </div>
      </div>
    );
  }

  const SastaBazarLogo = () => (
    <div className="flex flex-col items-center justify-center pt-2">
      <svg width="100" height="90" viewBox="30 10 160 150" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M70 140 L90 140 M60 150 L85 150" stroke="#F97316" strokeWidth="4" strokeLinecap="round" />
        <path d="M55 80 L80 105 L65 120 L40 95 Z" fill="#84CC16" />
        <circle cx="48" cy="90" r="3" fill="white" />
        <path d="M50 88 L75 70" stroke="#F97316" strokeWidth="2" strokeLinecap="round" />
        <path d="M50 70 L70 70 L90 130 L160 130 L175 80 L80 80" stroke="#F97316" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d="M95 95 L165 95 M100 115 L155 115" stroke="#84CC16" strokeWidth="5" strokeLinecap="round" />
        <path d="M115 80 L105 130 M145 80 L135 130" stroke="#84CC16" strokeWidth="5" strokeLinecap="round" />
        <circle cx="105" cy="145" r="8" fill="none" stroke="#F97316" strokeWidth="5" />
        <circle cx="150" cy="145" r="8" fill="none" stroke="#84CC16" strokeWidth="5" />
        <path d="M115 65 C 130 40, 150 30, 170 25" stroke="#F97316" strokeWidth="6" strokeLinecap="round" fill="none" />
        <path d="M150 25 L175 22 L170 45" stroke="#F97316" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <text x="110" y="50" fontFamily="sans-serif" fontWeight="900" fontSize="24" fill="#F97316">%</text>
      </svg>
      <div className="text-[#0F172A] text-2xl font-black tracking-tight mt-[-10px] font-sans">
        SASTA BAZAR
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-0 shadow-lg sm:border sm:border-gray-100 sm:rounded-2xl">
        <CardHeader className="space-y-1 text-center">
          <SastaBazarLogo />
          <CardTitle className="text-xl font-bold mt-2 text-black uppercase tracking-tight" style={{ fontFamily: "'Currator', 'Curator', sans-serif" }}>Seller Login</CardTitle>
          <CardDescription className="text-gray-500 font-medium">
            Login to manage your products and orders
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <p className="text-xs text-gray-500 font-medium">
                Login uses the configured seller account email.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="login-password" className="text-black font-semibold">Password</Label>
              <Input
                id="login-password"
                type="password"
                placeholder="Enter your seller password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
                minLength={6}
                className="w-full py-6 px-4 border-none bg-[#c9d1d96e] rounded-xl text-black text-base focus-visible:ring-1 focus-visible:ring-[#F97316] placeholder:text-gray-400"
              />
            </div>
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setIsForgotPasswordOpen(true)}
                className="text-sm text-[#F97316] font-semibold hover:underline"
              >
                Forgot Password?
              </button>
            </div>
            <Button 
              type="submit" 
              className={`w-full py-6 rounded-xl text-lg font-semibold transition-colors shadow-none mt-4 ${loginPassword.length > 0 ? 'bg-[#F97316] hover:bg-[#EA580C] text-white' : 'bg-gray-200 text-gray-400 hover:bg-gray-200 cursor-not-allowed'}`}
              disabled={isLoading || !loginPassword}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging in...
                </>
              ) : (
                "Login"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Dialog
        open={isForgotPasswordOpen}
        onOpenChange={(open) => {
          setIsForgotPasswordOpen(open);
          if (!open) resetForgotPasswordState();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Forgot Seller Password</DialogTitle>
            <DialogDescription>
              {forgotPasswordStep === "email" && "A reset code will be sent to your seller email."}
              {forgotPasswordStep === "otp" && "Enter the 6-digit code from your password reset email."}
              {forgotPasswordStep === "password" && "Set your new seller password."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {forgotPasswordStep === "email" && (
              <div className="space-y-2">
                <Label htmlFor="seller-forgot-email">Email</Label>
                <Input
                  id="seller-forgot-email"
                  type="email"
                  placeholder="Registered seller email"
                  value={forgotPasswordData.email}
                  onChange={(e) =>
                    setForgotPasswordData((prev) => ({ ...prev, email: e.target.value }))
                  }
                  required
                />
              </div>
            )}

            {forgotPasswordStep === "otp" && (
              <div className="space-y-2">
                {forgotOtpSentToEmail && (
                  <p className="text-xs text-muted-foreground">
                    Code was sent to <span className="font-medium text-foreground">{forgotOtpSentToEmail}</span>.
                  </p>
                )}
                <Label htmlFor="seller-forgot-otp">Reset code</Label>
                <Input
                  id="seller-forgot-otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="Enter 6-digit code"
                  value={forgotPasswordData.otp}
                  onChange={(e) =>
                    setForgotPasswordData((prev) => ({
                      ...prev,
                      otp: e.target.value.replace(/\D/g, "").slice(0, 6),
                    }))
                  }
                  maxLength={6}
                  required
                />
              </div>
            )}

            {forgotPasswordStep === "password" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="seller-new-password">New Password</Label>
                  <Input
                    id="seller-new-password"
                    type="password"
                    placeholder="Enter new password"
                    value={forgotPasswordData.newPassword}
                    onChange={(e) =>
                      setForgotPasswordData((prev) => ({ ...prev, newPassword: e.target.value }))
                    }
                    minLength={6}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="seller-confirm-password">Confirm Password</Label>
                  <Input
                    id="seller-confirm-password"
                    type="password"
                    placeholder="Confirm new password"
                    value={forgotPasswordData.confirmPassword}
                    onChange={(e) =>
                      setForgotPasswordData((prev) => ({ ...prev, confirmPassword: e.target.value }))
                    }
                    minLength={6}
                    required
                  />
                </div>
              </>
            )}

            {forgotPasswordStep === "email" && (
              <div className="space-y-2">
                <Button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={isForgotLoading || otpCooldown > 0}
                  className="w-full"
                >
                  {isForgotLoading
                    ? "Sending..."
                    : otpCooldown > 0
                    ? `Resend in ${otpCooldown}s`
                    : "Send code"}
                </Button>
                {otpCooldown > 0 && (
                  <p className="text-xs text-muted-foreground text-center">
                    Please wait before requesting another OTP.
                  </p>
                )}
              </div>
            )}
            {forgotPasswordStep === "otp" && (
              <Button type="button" onClick={handleVerifyOtp} disabled={isForgotLoading} className="w-full">
                {isForgotLoading ? "Verifying..." : "Verify code"}
              </Button>
            )}
            {forgotPasswordStep === "password" && (
              <Button type="button" onClick={handleResetPassword} disabled={isForgotLoading} className="w-full">
                {isForgotLoading ? "Updating Password..." : "Change Password"}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};