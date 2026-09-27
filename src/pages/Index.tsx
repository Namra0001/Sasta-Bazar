import { useState, useEffect } from "react";
import type { Session } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
import { Login } from "./Login";
import { Dashboard } from "./Dashboard";
import { supabase } from "@/integrations/supabase/client";
import {
  clearPasswordResetUiBlock,
  isPasswordResetUiBlocked,
} from "@/lib/passwordResetFlow";

const Index = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const applySessionToUi = (session: Session | null) => {
      if (!session) {
        clearPasswordResetUiBlock();
        setIsLoggedIn(false);
        return;
      }
      if (isPasswordResetUiBlocked()) {
        setIsLoggedIn(false);
        return;
      }
      setIsLoggedIn(true);
      navigate("/shop");
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      applySessionToUi(session);
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      applySessionToUi(session);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogin = () => {
    setIsLoggedIn(true);
    navigate("/shop");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsLoggedIn(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {!isLoggedIn ? (
        <Login onLogin={handleLogin} />
      ) : (
        <Dashboard onLogout={handleLogout} />
      )}
    </>
  );
};

export default Index;
