import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { HeroSection } from "@/components/HeroSection";

interface DashboardProps {
  onLogout: () => void;
}

export const Dashboard = ({ onLogout }: DashboardProps) => {
  const [cartCount, setCartCount] = useState(0);

  const handleSearch = (query: string) => {
    console.log("Search:", query);
  };

  const handleCartClick = () => {
    console.log("Navigate to cart");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar 
        cartCount={cartCount}
        onSearch={handleSearch}
        onCartClick={handleCartClick}
        onLogout={onLogout}
      />
      
      <main>
        <HeroSection />
      </main>
    </div>
  );
};