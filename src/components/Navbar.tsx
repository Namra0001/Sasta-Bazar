import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, ShoppingCart, User, Menu, X, MapPin, Package, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ProfileDialog } from "./ProfileDialog";
import { AddressDialog } from "./AddressDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

interface NavbarProps {
  cartCount?: number;
  onSearch?: (query: string) => void;
  onCartClick?: () => void;
  onLogout?: () => void;
  selectedCategory?: string;
  onCategoryChange?: (category: string) => void;
}

export const Navbar = ({
  cartCount = 0,
  onSearch,
  onCartClick,
  onLogout,
  selectedCategory = "all",
  onCategoryChange
}: NavbarProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [addressOpen, setAddressOpen] = useState(false);
  const [hasAlert, setHasAlert] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAlerts = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data, error } = await supabase
        .from('price_alerts')
        .select('*, products ( price )')
        .eq('user_id', user.id)
        .eq('is_active', true);
        
      if (!error && data) {
        const triggered = data.some(alert => (alert.products as any)?.price <= alert.target_price);
        setHasAlert(triggered);
      }
    };
    
    checkAlerts();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(searchQuery);
  };

  return (
    <nav className="bg-white text-black border-b border-border sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div
            className="flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity mr-2"
            onClick={() => navigate('/shop')}
          >
            <div className="flex items-center justify-center h-[80%]">
              <img
                src="/logo.png"
                alt="Sasta Bazar"
                className="h-8 md:h-12 object-contain"
              />
            </div>
          </div>

          {/* Location Widget */}
          <div
            className="hidden md:flex items-center cursor-pointer hover:border-black border border-transparent p-1 px-2 rounded-sm transition-colors text-sm mr-4"
            onClick={() => setAddressOpen(true)}
          >
            <MapPin className="h-5 w-5 text-gray-700 mr-1" />
            <div className="font-bold whitespace-nowrap text-sm text-black">
              Update location
            </div>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex flex-1 mx-2 md:mx-8">
            <div className="relative w-full flex">
              <Select value={selectedCategory} onValueChange={(val) => onCategoryChange?.(val)}>
                <SelectTrigger className="w-[80px] md:w-[160px] h-10 bg-gray-100 border-none border-r border-gray-300 rounded-none rounded-l-md focus:ring-0 focus:ring-offset-0 shadow-none text-gray-700 overflow-hidden whitespace-nowrap text-ellipsis px-2 md:px-3">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Categories</SelectItem>
                  <SelectItem value="men">Men's Wear</SelectItem>
                  <SelectItem value="women">Women's Wear</SelectItem>
                  <SelectItem value="shirts">Shirts</SelectItem>
                  <SelectItem value="jeans">Jeans</SelectItem>
                  <SelectItem value="dresses">Dresses</SelectItem>
                  <SelectItem value="jackets">Jackets</SelectItem>
                  <SelectItem value="blazers">Blazers</SelectItem>
                  <SelectItem value="skirts">Skirts</SelectItem>
                  <SelectItem value="accessories">Accessories</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="bg-gray-100 text-black border-none focus-visible:ring-2 focus-visible:ring-orange-400 rounded-none h-10 px-2 md:px-3 text-sm md:text-base w-full min-w-0"
              />
              <Button type="submit" className="h-10 rounded-l-none rounded-r-md bg-[#febd69] hover:bg-[#f3a847] text-black border-none px-3 md:px-4 shrink-0">
                <Search className="h-4 w-4 md:h-5 md:w-5" />
              </Button>
            </div>
          </form>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/orders')} className="hover:bg-gray-100 text-black font-bold h-10 px-2 flex items-center">
              <Package className="h-5 w-5 mr-2 text-gray-700" />
              <span>Orders</span>
            </Button>

            <Button variant="ghost" size="sm" onClick={() => navigate('/qa')} className="hover:bg-gray-100 text-black font-bold h-10 px-2 flex items-center">
              <MessageSquare className="h-5 w-5 mr-2 text-gray-700" />
              <span>Q&A</span>
            </Button>

            <Button variant="ghost" size="sm" onClick={() => navigate('/cart')} className="relative hover:bg-gray-100 text-black font-bold h-10 px-2 flex items-center">
              <ShoppingCart className="h-5 w-5 mr-2 text-gray-700" />
              <span>Cart</span>
              {cartCount > 0 && (
                <Badge className="absolute top-0 left-4 h-5 w-5 flex items-center justify-center p-0 text-xs rounded-full bg-orange-500 text-black border-none font-bold">
                  {cartCount}
                </Badge>
              )}
              {hasAlert && cartCount === 0 && (
                <div className="absolute top-1 left-5 h-3 w-3 rounded-full bg-red-600 border-2 border-white"></div>
              )}
              {hasAlert && cartCount > 0 && (
                <div className="absolute top-0 left-8 h-3 w-3 rounded-full bg-red-600 border-2 border-white"></div>
              )}
            </Button>

            <Button variant="ghost" size="sm" onClick={() => setProfileDialogOpen(true)} className="hover:bg-gray-100 text-black font-bold h-10 px-2">
              <User className="h-5 w-5 mr-2 text-gray-700" />
              Profile
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <Button variant="ghost" size="sm" className="md:hidden text-black hover:bg-gray-100" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border">


            {/* Mobile Navigation Links */}
            <div className="space-y-2">
              <Button variant="ghost" className="w-full justify-start" onClick={() => navigate('/orders')}>
                Orders
              </Button>

              <Button variant="ghost" className="w-full justify-start" onClick={() => navigate('/qa')}>
                <MessageSquare className="h-5 w-5 mr-2" />
                Q&A
              </Button>

              <Button variant="ghost" className="w-full justify-start relative" onClick={() => navigate('/cart')}>
                <ShoppingCart className="h-5 w-5 mr-2" />
                Cart ({cartCount})
                {hasAlert && (
                  <div className="absolute top-2 left-6 h-3 w-3 rounded-full bg-red-600 border-2 border-white"></div>
                )}
              </Button>

              <Button variant="ghost" className="w-full justify-start" onClick={() => setProfileDialogOpen(true)}>
                <User className="h-5 w-5 mr-2" />
                Profile
              </Button>
            </div>
          </div>
        )}
      </div>

      <ProfileDialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen} onLogout={onLogout || (() => { })} />
      <AddressDialog open={addressOpen} onOpenChange={setAddressOpen} />
    </nav>
  );
};