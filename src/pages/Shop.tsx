import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { ProductGrid } from "@/components/ProductGrid";
import { CategoryFilter } from "@/components/CategoryFilter";
import { useCart } from "@/contexts/CartContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
interface ShopProps {
  onLogout: () => void;
}
import { TrendingBanner } from "@/components/TrendingBanner";

export const Shop = ({
  onLogout
}: ShopProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const {
    cartCount,
    addToCart
  } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/");
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };
  const handleCartClick = () => {
    navigate("/cart");
  };
  return <div className="min-h-screen bg-background">
      <Navbar 
        cartCount={cartCount} 
        onSearch={handleSearch} 
        onCartClick={handleCartClick} 
        onLogout={onLogout} 
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
      />
      
      <TrendingBanner />

      <main className="container mx-auto px-4 py-8">
        <ProductGrid searchQuery={searchQuery} selectedCategory={selectedCategory} onAddToCart={addToCart} />
      </main>
    </div>;
};