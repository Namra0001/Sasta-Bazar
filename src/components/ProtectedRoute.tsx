import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export const ProtectedRoute = ({ children, role }: { children: React.ReactNode, role?: 'seller' | 'customer' }) => {
  const [isAllowed, setIsAllowed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate(role === 'seller' ? '/seller/auth' : '/');
          return;
        }

        if (role === 'seller') {
          const { data: roleData, error: roleError } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id)
            .eq("role", "seller")
            .limit(1)
            .maybeSingle();
            
          if (roleError) {
            console.error(roleError);
          }
          
          if (!roleData && user.email === 'namradabhi0001@gmail.com') {
            // Automatically assign the seller role in the database to fix RLS issues
            const { error: insertError } = await supabase.from("user_roles").insert({
              user_id: user.id,
              role: "seller"
            });
            if (insertError) {
              console.error("Failed to auto-assign seller role:", insertError);
            }
          } else if (!roleData && user.email !== 'namradabhi0001@gmail.com') {
            navigate('/seller/auth');
            return;
          }
        }
        
        setIsAllowed(true);
      } catch (error) {
        navigate(role === 'seller' ? '/seller/auth' : '/');
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuth();
  }, [navigate, role]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-[#F97316]" />
          <p className="text-muted-foreground">Verifying access...</p>
        </div>
      </div>
    );
  }

  return isAllowed ? <>{children}</> : null;
};
