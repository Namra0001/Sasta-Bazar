import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import { Shop } from "./pages/Shop";
import { Cart } from "./pages/Cart";
import { Orders } from "./pages/Orders";
import { Trends } from "./pages/Trends";
import { SellerDashboard } from "./pages/SellerDashboard";
import { SellerAuth } from "./pages/SellerAuth";
import { SellerProfile } from "./pages/SellerProfile";
import { SellerAddProduct } from "./pages/SellerAddProduct";
import { SellerManageOffers } from "./pages/SellerManageOffers";
import { SellerCustomerTalk } from "./pages/SellerCustomerTalk";
import { ProductDetails } from "./pages/ProductDetails";
import { CustomerQA } from "./pages/CustomerQA";
import { SignupConfirmation } from "./pages/SignupConfirmation";
import { DeliveryTracker } from "./pages/DeliveryTracker";
import NotFound from "./pages/NotFound";
import { useState } from "react";
import { CartProvider } from "./contexts/CartContext";

import { ProtectedRoute } from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleLogout = () => {
    setIsLoggedIn(false);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <CartProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/shop" element={<ProtectedRoute><Shop onLogout={handleLogout} /></ProtectedRoute>} />
              <Route path="/cart" element={<ProtectedRoute><Cart onLogout={handleLogout} /></ProtectedRoute>} />
              <Route path="/orders" element={<ProtectedRoute><Orders onLogout={handleLogout} /></ProtectedRoute>} />
              <Route path="/trends" element={<ProtectedRoute><Trends onLogout={handleLogout} /></ProtectedRoute>} />
              <Route path="/qa" element={<ProtectedRoute role="user"><CustomerQA /></ProtectedRoute>} />
              <Route path="/product/:id" element={<ProtectedRoute><ProductDetails onLogout={handleLogout} /></ProtectedRoute>} />
              <Route path="/seller/auth" element={<SellerAuth />} />
              <Route path="/seller" element={<ProtectedRoute role="seller"><SellerDashboard /></ProtectedRoute>} />
              <Route path="/seller/profile" element={<ProtectedRoute role="seller"><SellerProfile /></ProtectedRoute>} />
              <Route path="/seller/add-product" element={<ProtectedRoute role="seller"><SellerAddProduct /></ProtectedRoute>} />
              <Route path="/seller/manage-offers" element={<ProtectedRoute role="seller"><SellerManageOffers /></ProtectedRoute>} />
              <Route path="/seller/customer-talk" element={<ProtectedRoute role="seller"><SellerCustomerTalk /></ProtectedRoute>} />
              <Route path="/auth/confirm-signup" element={<SignupConfirmation />} />
              <Route path="/delivery/:id" element={<DeliveryTracker />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </CartProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
