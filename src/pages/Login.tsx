import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { syncProfileFromCurrentUser } from "@/lib/syncUserProfile";
import { ArrowLeft, MessageSquare, Mail, Eye, EyeOff } from "lucide-react";
import { setPasswordResetUiBlock, clearPasswordResetUiBlock } from "@/lib/passwordResetFlow";

const countryCodeToInfo: Record<string, string> = {
  "+1": "US/CA", "+44": "GB", "+91": "IN", "+61": "AU", "+81": "JP",
  "+49": "DE", "+33": "FR", "+39": "IT", "+86": "CN", "+7": "RU",
  "+55": "BR", "+52": "MX", "+34": "ES", "+82": "KR", "+62": "ID",
  "+90": "TR", "+31": "NL", "+41": "CH", "+46": "SE", "+65": "SG",
  "+971": "AE", "+966": "SA", "+27": "ZA", "+54": "AR", "+60": "MY",
  "+63": "PH", "+64": "NZ", "+20": "EG", "+234": "NG", "+254": "KE",
  "+92": "PK", "+880": "BD", "+94": "LK", "+977": "NP",
  "+212": "MA", "+213": "DZ", "+216": "TN", "+218": "LY",
  "+30": "GR", "+32": "BE", "+36": "HU", "+43": "AT", "+45": "DK",
  "+47": "NO", "+48": "PL", "+351": "PT", "+353": "IE", "+358": "FI",
  "+93": "AF", "+95": "MM", "+98": "IR", "+251": "ET", "+255": "TZ",
  "+256": "UG", "+51": "PE", "+56": "CL", "+57": "CO", "+58": "VE",
  "+886": "TW", "+852": "HK", "+853": "MO", "+968": "OM", "+974": "QA",
  "+973": "BH", "+965": "KW", "+962": "JO", "+961": "LB", "+964": "IQ"
};

const getCountryName = (code: string) => {
  const normalizedCode = code.startsWith("+") ? code : `+${code}`;
  return countryCodeToInfo[normalizedCode] || "";
};

interface LoginProps {
  onLogin: () => void;
}

export const Login = ({ onLogin }: LoginProps) => {
  const [view, setView] = useState<"signin" | "signup" | "otp" | "reset-password">("signin");
  const [otpType, setOtpType] = useState<"signup" | "recovery">("signup");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Sign In Data
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginCountryCode, setLoginCountryCode] = useState("+91");
  const [loginPhone, setLoginPhone] = useState("");

  // Sign Up Data
  const [signupData, setSignupData] = useState({ 
    email: "", 
    password: "", 
    mobile: "", 
    address: "",
    fullName: ""
  });
  const [signupCountryCode, setSignupCountryCode] = useState("+91");
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [timer, setTimer] = useState(27);
  const { toast } = useToast();

  useEffect(() => {
    let interval: number;
    if (view === "otp" && timer > 0) {
      interval = window.setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [view, timer]);

  const handleSignInContinue = async () => {
    if (!loginEmail.trim() || !loginPassword) {
      toast({ title: "Missing fields", description: "Email and password are required.", variant: "destructive" });
      return;
    }
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail.trim(),
        password: loginPassword,
      });
      if (error) throw error;

      await syncProfileFromCurrentUser();
      toast({ title: "Success", description: "Logged in successfully!" });
      onLogin();
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid credentials. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUpContinue = async () => {
    if (!signupData.email || !signupData.password) {
      toast({ title: "Missing fields", description: "Email and password are required.", variant: "destructive" });
      return;
    }
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: signupData.email,
        password: signupData.password,
        options: {
          data: {
            full_name: signupData.fullName,
            mobile: signupData.mobile ? `${signupCountryCode}${signupData.mobile}` : "",
            address: signupData.address,
          },
        },
      });

      if (error) throw error;

      if (data.user && data.user.identities && data.user.identities.length === 0) {
        toast({
          title: "User already exist",
          description: "Please log in with this email instead.",
          variant: "destructive",
        });
        return;
      }

      if (data.session) {
        await syncProfileFromCurrentUser();
        toast({ title: "Account created", description: "Welcome to Sasta Bazar." });
        onLogin();
        return;
      }

      setOtp("");
      setOtpType("signup");
      setView("otp");
      setTimer(27);
      toast({
        title: "Check your email",
        description: "Enter the 6-digit code we sent to verify your account.",
      });
    } catch (error: any) {
      toast({
        title: "Signup Failed",
        description: error.message || "Failed to create account",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length < 6) return;
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.verifyOtp({
        email: otpType === "signup" ? signupData.email.trim() : loginEmail.trim(),
        token: otp,
        type: otpType === "signup" ? "signup" : "email",
      });
      if (error) throw error;

      if (otpType === "signup") {
        await syncProfileFromCurrentUser();
        toast({ title: "Success", description: "Account verified and logged in!" });
        onLogin();
      } else {
        toast({ title: "Success", description: "Code verified. Please set your new password." });
        setView("reset-password");
      }
    } catch (error: any) {
      toast({
        title: "Verification failed",
        description: error.message || "Invalid code.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword !== confirmPassword) {
      toast({ title: "Error", description: "Passwords do not match.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      clearPasswordResetUiBlock();
      toast({ title: "Success", description: "Password updated successfully!" });
      onLogin();
    } catch (error: any) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/shop`,
        },
      });
      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "Google Login Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Forgot password handler using Supabase email verification
  const handleForgotPassword = async () => {
    if (!loginEmail) {
      toast({
        title: "Missing email",
        description: "Please enter your email address first.",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);
    try {
      // Use signInWithOtp to check if user exists. If they don't, it throws an error we can catch.
      const { error } = await supabase.auth.signInWithOtp({
        email: loginEmail,
        options: { shouldCreateUser: false },
      });
      if (error) {
        if (error.message.includes("Signups not allowed")) {
          toast({
            title: "Email not found",
            description: "Please sign up with this email.",
            variant: "destructive",
          });
          return;
        }
        throw error;
      }
      toast({
        title: "Email sent",
        description: "Check your inbox for a verification code.",
        variant: "default",
      });
      setPasswordResetUiBlock();
      setOtp("");
      // When using signInWithOtp, the token type to verify is 'email', but we need to log them in to update password
      setOtpType("recovery"); 
      // Actually we will just verify as 'email' token for this flow
      setTimer(27);
      setView("otp");
    } catch (error: any) {
      toast({
        title: "Failed to send reset email",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const GoogleIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25C22.56 11.47 22.49 10.72 22.36 10H12V14.26H17.92C17.67 15.63 16.86 16.79 15.69 17.57V20.34H19.26C21.36 18.42 22.56 15.6 22.56 12.25Z" fill="#4285F4"/>
      <path d="M12 23C14.97 23 17.46 22.02 19.26 20.34L15.69 17.57C14.71 18.23 13.47 18.63 12 18.63C9.16 18.63 6.76 16.71 5.88 14.15H2.21V16.99C4.01 20.56 7.7 23 12 23Z" fill="#34A853"/>
      <path d="M5.88 14.15C5.66 13.49 5.53 12.77 5.53 12C5.53 11.23 5.66 10.51 5.88 9.85V7.01H2.21C1.47 8.5 1 10.19 1 12C1 13.81 1.47 15.5 2.21 16.99L5.88 14.15Z" fill="#FBBC05"/>
      <path d="M12 5.38C13.62 5.38 15.06 5.94 16.21 7.02L19.34 3.89C17.45 2.13 14.97 1 12 1C7.7 1 4.01 3.44 2.21 7.01L5.88 9.85C6.76 7.29 9.16 5.38 12 5.38Z" fill="#EA4335"/>
    </svg>
  );

  // Custom SVG Logo Component (matching the 3rd image)
  const SastaBazarLogo = () => (
    <div className="flex flex-col items-center justify-center pt-2">
      <svg width="100" height="90" viewBox="30 10 160 150" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Motion lines */}
        <path d="M70 140 L90 140 M60 150 L85 150" stroke="#F97316" strokeWidth="4" strokeLinecap="round" />
        
        {/* Green tag */}
        <path d="M55 80 L80 105 L65 120 L40 95 Z" fill="#84CC16" />
        <circle cx="48" cy="90" r="3" fill="white" />
        <path d="M50 88 L75 70" stroke="#F97316" strokeWidth="2" strokeLinecap="round" />

        {/* Cart handle and base */}
        <path d="M50 70 L70 70 L90 130 L160 130 L175 80 L80 80" stroke="#F97316" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        
        {/* Green basket grid */}
        <path d="M95 95 L165 95 M100 115 L155 115" stroke="#84CC16" strokeWidth="5" strokeLinecap="round" />
        <path d="M115 80 L105 130 M145 80 L135 130" stroke="#84CC16" strokeWidth="5" strokeLinecap="round" />
        
        {/* Wheels */}
        <circle cx="105" cy="145" r="8" fill="none" stroke="#F97316" strokeWidth="5" />
        <circle cx="150" cy="145" r="8" fill="none" stroke="#84CC16" strokeWidth="5" />
        
        {/* Arrow and % */}
        <path d="M115 65 C 130 40, 150 30, 170 25" stroke="#F97316" strokeWidth="6" strokeLinecap="round" fill="none" />
        <path d="M150 25 L175 22 L170 45" stroke="#F97316" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <text x="110" y="50" fontFamily="sans-serif" fontWeight="900" fontSize="24" fill="#F97316">%</text>
      </svg>
      <div className="text-[#0F172A] text-2xl font-black tracking-tight mt-[-10px] font-sans">
        SASTA BAZAR
      </div>
    </div>
  );

  // Column 1: Fruits, Tools, Clothes, Grocery (Unique Images)
  const column1 = [
    "/img_1.png",
    "/img_2.png",
    "/img_3.png",
    "/img_1.png",
    "/img_2.png",
    "/img_3.png",
    "/img_1.png",
    "/img_2.png",
  ];
  
  // Column 2: Clothes, Grocery, Appliances, Clothes (Unique Images)
  const column2 = [
    "/img_4.png",
    "/img_5.png",
    "/img_6.png",
    "/img_4.png",
    "/img_5.png",
    "/img_6.png",
    "/img_4.png",
    "/img_5.png",
  ];
  
  // Column 3: Appliances, Clothes, Tools, Grocery (Unique Images)
  const column3 = [
    "/img_3.png",
    "/img_1.png",
    "/img_2.png",
    "/img_3.png",
    "/img_1.png",
    "/img_2.png",
    "/img_3.png",
    "/img_1.png",
  ];

  return (
    <div className="min-h-screen bg-white flex items-center justify-center" style={{ fontFamily: "'Serafin', serif" }}>
      {/* Main Container - Full white page design */}
      <div className="w-full h-full md:h-[100dvh] bg-white overflow-hidden flex flex-col md:flex-row relative">
        
        {/* Left Side (Desktop) - Animated Columns */}
        <div className="hidden md:flex w-full md:w-[50%] lg:w-[60%] md:h-full bg-white relative overflow-hidden pt-4 px-4 gap-4 sm:gap-8 justify-center">
          {/* Column 1 */}
          <div className="w-24 md:w-32 lg:w-40 flex flex-col gap-6 animate-scroll-up">
            {column1.map((src, i) => (
              <img key={i} src={src} alt="Grocery" className="w-full aspect-square object-cover rounded-2xl mix-blend-multiply border border-gray-100" />
            ))}
          </div>
          {/* Column 2 */}
          <div className="w-24 md:w-32 lg:w-40 flex flex-col gap-6 animate-scroll-down mt-[-50%]">
            {column2.map((src, i) => (
              <img key={i} src={src} alt="Items" className="w-full aspect-square object-cover rounded-2xl mix-blend-multiply border border-gray-100" />
            ))}
          </div>
          {/* Column 3 */}
          <div className="w-24 md:w-32 lg:w-40 flex flex-col gap-6 animate-scroll-up">
            {column3.map((src, i) => (
              <img key={i} src={src} alt="Kitchen" className="w-full aspect-square object-cover rounded-2xl mix-blend-multiply border border-gray-100" />
            ))}
          </div>
          {/* Gradients to fade out top and bottom edges smoothly */}
          <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-white to-transparent z-10 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent z-10 pointer-events-none"></div>
        </div>

        {/* Right Side (Desktop) / Full Height (Mobile) - Auth Form */}
        <div className="w-full md:w-[50%] lg:w-[40%] h-full bg-white relative bottom-0 flex flex-col items-center pt-8 pb-10 px-6 sm:px-12 z-20 overflow-y-auto border-l border-gray-100">
          
          {view === "signin" && (
            <div className="w-full max-w-sm flex flex-col items-center pb-8 md:justify-center md:h-full">
              <SastaBazarLogo />
              <div className="h-8"></div>
              <p className="text-gray-500 mb-8 font-black uppercase tracking-wide" style={{ fontFamily: "'Currator', 'Curator', sans-serif" }}>
                <b>WELCOME BACK'S YOU</b>
              </p>

              <div className="w-full space-y-4 mb-6">
                <div className="space-y-1.5">
                  <Label className="text-black font-semibold flex items-center gap-1">
                    Email <span className="text-red-500 text-lg leading-none">*</span>
                  </Label>
                  <div className="relative">
                    <Mail className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <Input 
                      type="email" 
                      placeholder="Enter your email" 
                      className="w-full pl-10 py-6 border-none bg-[#c9d1d96e] rounded-xl text-black text-base focus-visible:ring-1 focus-visible:ring-[#F97316] placeholder:text-gray-400"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-black font-semibold flex items-center gap-1">
                    Password <span className="text-red-500 text-lg leading-none">*</span>
                  </Label>
                  <div className="relative">
                    <Input 
                      type={showLoginPassword ? "text" : "password"} 
                      placeholder="Enter your password" 
                      className="w-full py-6 pr-10 border-none bg-[#c9d1d96e] rounded-xl text-black text-base focus-visible:ring-1 focus-visible:ring-[#F97316] placeholder:text-gray-400"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-black bg-transparent"
                    >
                      {showLoginPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                    {/* Forgot Password */}
                    <button
                      type="button"
                      className="absolute right-0 top-[-1.8rem] text-sm text-blue-900 font-semibold hover:underline"
                      onClick={handleForgotPassword}
                    >
                      Forgot password?
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-black font-semibold flex justify-between">
                    <span>Phone No. <span className="ml-2 text-sm text-gray-500 font-bold">{getCountryName(loginCountryCode)}</span></span>
                    <span className="text-gray-400 font-normal text-xs">(Optional)</span>
                  </Label>
                  <div className="flex gap-2">
                    <Input 
                      type="text" 
                      placeholder="+91" 
                      className="w-20 py-6 border-none bg-[#c9d1d96e] rounded-xl text-center text-black text-base focus-visible:ring-1 focus-visible:ring-[#F97316] placeholder:text-gray-400"
                      value={loginCountryCode}
                      onChange={(e) => setLoginCountryCode(e.target.value)}
                    />
                    <Input 
                      type="tel" 
                      placeholder="Phone Number" 
                      className="w-full py-6 border-none bg-[#c9d1d96e] rounded-xl text-black text-base focus-visible:ring-1 focus-visible:ring-[#F97316] placeholder:text-gray-400"
                      value={loginPhone}
                      onChange={(e) => setLoginPhone(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <Button 
                className={`w-full py-6 rounded-xl text-lg font-semibold transition-colors shadow-none ${(loginEmail.length > 0 && loginPassword.length > 0) ? 'bg-[#F97316] hover:bg-[#EA580C] text-white' : 'bg-gray-200 text-gray-400 hover:bg-gray-200 cursor-not-allowed'}`}
                disabled={loginEmail.length === 0 || loginPassword.length === 0 || isLoading}
                onClick={handleSignInContinue}
              >
                {isLoading ? "Signing in..." : "Continue"}
              </Button>

              <div className="flex items-center w-full my-6">
                <div className="flex-1 border-t border-gray-200"></div>
                <span className="px-4 text-xs text-gray-400 font-medium">OR</span>
                <div className="flex-1 border-t border-gray-200"></div>
              </div>

              <Button 
                variant="outline" 
                className="w-full py-6 rounded-xl text-base font-semibold bg-white hover:bg-gray-50 border-gray-200 flex items-center justify-center gap-3 shadow-none text-black mb-6"
                onClick={handleGoogleLogin}
              >
                <GoogleIcon />
                <span>Continue with Google</span>
              </Button>

              <p className="text-gray-600">
                Don't have an account?{" "}
                <button onClick={() => setView("signup")} className="text-[#F97316] font-semibold hover:underline">Sign up</button>
              </p>
            </div>
          )}

          {view === "signup" && (
            <div className="w-full max-w-sm flex flex-col items-center pb-8 animate-in fade-in zoom-in-95 duration-200 pt-8">
              <SastaBazarLogo />
              <div className="h-8"></div>
              <div className="w-full flex items-center justify-between mb-6">
                <button onClick={() => setView("signin")} className="p-2 -ml-2 rounded-full hover:bg-gray-100">
                  <ArrowLeft className="w-5 h-5 text-black" />
                </button>
                <h2 className="text-xl font-bold text-black flex-1 text-center pr-6 uppercase" style={{ fontFamily: "'Currator', 'Curator', sans-serif" }}>Sign Up</h2>
              </div>

              <div className="w-full space-y-4 mb-6">
                <div className="space-y-1.5">
                  <Label className="text-black font-semibold">Full Name</Label>
                  <Input 
                    type="text" placeholder="Enter your full name" 
                    className="w-full py-5 border-none bg-[#c9d1d96e] rounded-xl text-black placeholder:text-gray-400 focus-visible:ring-1 focus-visible:ring-[#F97316]"
                    value={signupData.fullName} onChange={(e) => setSignupData({...signupData, fullName: e.target.value})}
                  />
                </div>
                
                <div className="space-y-1.5">
                  <Label className="flex gap-1 text-black font-semibold">Email <span className="text-red-500">*</span></Label>
                  <Input 
                    type="email" placeholder="Enter your email" required
                    className="w-full py-5 border-none bg-[#c9d1d96e] rounded-xl text-black placeholder:text-gray-400 focus-visible:ring-1 focus-visible:ring-[#F97316]"
                    value={signupData.email} onChange={(e) => setSignupData({...signupData, email: e.target.value})}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-black font-semibold flex justify-between">
                    <span>Mobile Number <span className="ml-2 text-sm text-gray-500 font-bold">{getCountryName(signupCountryCode)}</span></span>
                  </Label>
                  <div className="flex gap-2">
                    <Input 
                      type="text" 
                      placeholder="+91" 
                      className="w-20 py-5 border-none bg-[#c9d1d96e] rounded-xl text-center text-black text-base focus-visible:ring-1 focus-visible:ring-[#F97316] placeholder:text-gray-400"
                      value={signupCountryCode}
                      onChange={(e) => setSignupCountryCode(e.target.value)}
                    />
                    <Input 
                      type="tel" placeholder="Enter mobile number" 
                      className="w-full py-5 border-none bg-[#c9d1d96e] rounded-xl text-black placeholder:text-gray-400 focus-visible:ring-1 focus-visible:ring-[#F97316]"
                      value={signupData.mobile} onChange={(e) => setSignupData({...signupData, mobile: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-black font-semibold">Address</Label>
                  <Input 
                    type="text" placeholder="Enter your address" 
                    className="w-full py-5 border-none bg-[#c9d1d96e] rounded-xl text-black placeholder:text-gray-400 focus-visible:ring-1 focus-visible:ring-[#F97316]"
                    value={signupData.address} onChange={(e) => setSignupData({...signupData, address: e.target.value})}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="flex gap-1 text-black font-semibold">Password <span className="text-red-500">*</span></Label>
                  <div className="relative">
                    <Input 
                      type={showSignupPassword ? "text" : "password"} placeholder="Create a password" required
                      className="w-full py-5 pr-10 border-none bg-[#c9d1d96e] rounded-xl text-black placeholder:text-gray-400 focus-visible:ring-1 focus-visible:ring-[#F97316]"
                      value={signupData.password} onChange={(e) => setSignupData({...signupData, password: e.target.value})}
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowSignupPassword(!showSignupPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-black bg-transparent"
                    >
                      {showSignupPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </div>

              <Button 
                className={`w-full py-6 rounded-xl text-lg font-semibold transition-colors shadow-none ${(signupData.email.length > 0 && signupData.password.length > 0) ? 'bg-[#F97316] hover:bg-[#EA580C] text-white' : 'bg-gray-200 text-gray-400 hover:bg-gray-200 cursor-not-allowed'}`}
                disabled={!signupData.email || !signupData.password || isLoading}
                onClick={handleSignUpContinue}
              >
                {isLoading ? "Creating..." : "Create Account"}
              </Button>

              <p className="text-gray-600">
                Already have an account?{" "}
                <button onClick={() => setView("signin")} className="text-[#F97316] font-semibold hover:underline">Log in</button>
              </p>
            </div>
          )}

          {view === "otp" && (
            <div className="w-full max-w-sm flex flex-col pt-4 md:justify-center md:h-full animate-in slide-in-from-right-8 duration-300">
              <button onClick={() => setView(otpType === "signup" ? "signup" : "signin")} className="mb-8 w-fit p-2 -ml-2 rounded-full hover:bg-gray-100">
                <ArrowLeft className="w-6 h-6 text-black" />
              </button>
              
              <h2 className="text-xl font-semibold mb-8 text-black text-center">OTP verification</h2>
              <div className="text-center w-full">
                 <p className="text-gray-600 mb-8 font-medium">
                   We've sent a verification code to<br/>
                   <span className="font-semibold text-black">{otpType === "signup" ? signupData.email : loginEmail}</span>
                 </p>

                 <div className="flex justify-center gap-2 sm:gap-3 mb-8 w-full">
                   {[0, 1, 2, 3, 4, 5].map((index) => (
                     <input
                       key={index}
                       type="text"
                       maxLength={1}
                       className="w-10 h-12 sm:w-12 sm:h-14 border border-gray-300 bg-[#c9d1d96e] rounded-xl text-center text-xl font-bold focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316] outline-none transition-all text-black"
                       value={otp[index] || ""}
                       onChange={(e) => {
                         const val = e.target.value.replace(/\D/g, "");
                         let newOtp = otp.split("");
                         newOtp[index] = val;
                         setOtp(newOtp.join(""));
                         if (val && index < 5) {
                           const nextInput = document.getElementById(`otp-${index + 1}`);
                           if (nextInput) nextInput.focus();
                         }
                       }}
                       onKeyDown={(e) => {
                         if (e.key === "Backspace" && !otp[index] && index > 0) {
                           const prevInput = document.getElementById(`otp-${index - 1}`);
                           if (prevInput) prevInput.focus();
                         }
                       }}
                       id={`otp-${index}`}
                     />
                   ))}
                 </div>

                 <p className="text-sm font-medium mb-8">
                   {timer > 0 ? (
                     <span className="text-gray-400">Resend OTP in {timer}s</span>
                   ) : (
                     <button onClick={otpType === "signup" ? handleSignUpContinue : handleForgotPassword} className="text-[#F97316]">Resend OTP</button>
                   )}
                 </p>
              </div>
              
              <div className="mt-auto pb-8 pt-4">
                <div className="bg-[#f0f4ff] rounded-full py-3 px-4 flex items-center justify-center gap-2 mb-6 mx-auto w-fit text-sm text-gray-700 font-medium cursor-pointer">
                  <MessageSquare className="w-4 h-4 text-[#1877F2]" />
                  <span>Autofill code from Messages</span>
                </div>

                <Button 
                  className={`w-full py-6 rounded-xl text-lg font-semibold transition-colors shadow-none ${otp.length === 6 ? 'bg-[#1877F2] hover:bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'}`}
                  disabled={otp.length !== 6 || isLoading}
                  onClick={handleVerifyOtp}
                >
                  {isLoading ? "Verifying..." : "Verify"}
                </Button>
              </div>
            </div>
          )}

          {view === "reset-password" && (
            <div className="w-full max-w-sm flex flex-col items-center pb-8 animate-in fade-in zoom-in-95 duration-200 pt-8">
              <SastaBazarLogo />
              <div className="h-8"></div>
              <h2 className="text-xl font-bold text-black mb-6 uppercase" style={{ fontFamily: "'Currator', 'Curator', sans-serif" }}>PASSWORD RESET</h2>
              
              <div className="w-full space-y-4 mb-6">
                <div className="space-y-1.5">
                  <Label className="flex gap-1 text-black font-semibold">New Password <span className="text-red-500">*</span></Label>
                  <div className="relative">
                    <Input 
                      type={showLoginPassword ? "text" : "password"} placeholder="Enter new password" required
                      className="w-full py-5 pr-10 border-none bg-[#c9d1d96e] rounded-xl text-black placeholder:text-gray-400 focus-visible:ring-1 focus-visible:ring-[#F97316]"
                      value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-black bg-transparent"
                    >
                      {showLoginPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="flex gap-1 text-black font-semibold">Confirm New Password <span className="text-red-500">*</span></Label>
                  <div className="relative">
                    <Input 
                      type={showConfirmPassword ? "text" : "password"} placeholder="Confirm new password" required
                      className="w-full py-5 pr-10 border-none bg-[#c9d1d96e] rounded-xl text-black placeholder:text-gray-400 focus-visible:ring-1 focus-visible:ring-[#F97316]"
                      value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-black bg-transparent"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </div>

              <Button 
                className={`w-full py-6 rounded-xl text-lg font-semibold transition-colors shadow-none ${newPassword.length > 0 && confirmPassword.length > 0 ? 'bg-[#F97316] hover:bg-[#EA580C] text-white' : 'bg-gray-200 text-gray-400 hover:bg-gray-200 cursor-not-allowed'}`}
                disabled={!newPassword || !confirmPassword || isLoading}
                onClick={handleResetPassword}
              >
                {isLoading ? "Updating..." : "Update Password"}
              </Button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};