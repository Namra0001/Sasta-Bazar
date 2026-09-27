import { Button } from "@/components/ui/button";
import { ShoppingBag, TrendingUp, Star } from "lucide-react";
import { Link } from "react-router-dom";

export const HeroSection = () => {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-background via-card to-background">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(125,211,252,0.1)_50%,transparent_75%,transparent_100%)]"></div>
      <div className="absolute top-10 left-10 w-20 h-20 bg-neon-purple/20 rounded-full blur-xl animate-float"></div>
      <div className="absolute bottom-10 right-10 w-32 h-32 bg-neon-blue/20 rounded-full blur-xl animate-float" style={{animationDelay: '1s'}}></div>
      
      <div className="container mx-auto px-4 py-20 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Hero Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
                <span className="bg-gradient-primary bg-clip-text text-transparent">
                  Fashion
                </span>
                <br />
                <span className="text-foreground">That Speaks</span>
                <br />
                <span className="bg-gradient-secondary bg-clip-text text-transparent">
                  Your Style
                </span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-md">
                Discover the latest trends in men's and women's fashion. 
                Quality clothes at unbeatable prices, delivered to your doorstep.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/shop">
                <Button 
                  size="lg" 
                  className="bg-gradient-primary hover:shadow-glow-primary transition-all duration-300 text-lg px-8 py-6 w-full"
                >
                  <ShoppingBag className="mr-2 h-5 w-5" />
                  Shop Now
                </Button>
              </Link>
              <Link to="/trends">
                <Button 
                  variant="outline" 
                  size="lg"
                  className="border-border hover:bg-secondary transition-all duration-300 text-lg px-8 py-6 w-full"
                >
                  <TrendingUp className="mr-2 h-5 w-5" />
                  View Trends
                </Button>
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 pt-8">
              <div className="text-center">
                <div className="text-2xl font-bold text-neon-purple">1000+</div>
                <div className="text-sm text-muted-foreground">Products</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-neon-blue">50k+</div>
                <div className="text-sm text-muted-foreground">Happy Customers</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center">
                  <div className="text-2xl font-bold text-neon-pink">4.9</div>
                  <Star className="h-5 w-5 text-neon-pink ml-1 fill-current" />
                </div>
                <div className="text-sm text-muted-foreground">Rating</div>
              </div>
            </div>
          </div>

          {/* Hero Image */}
          <div className="relative">
            <div className="relative bg-gradient-accent rounded-3xl p-8 shadow-glow-accent">
              <div className="aspect-square bg-card rounded-2xl flex items-center justify-center">
                <div className="text-center space-y-4">
                  <div className="w-32 h-32 bg-gradient-primary rounded-full mx-auto flex items-center justify-center animate-glow">
                    <ShoppingBag className="h-16 w-16 text-primary-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground">Premium Collection</h3>
                  <p className="text-muted-foreground">Curated fashion for every occasion</p>
                </div>
              </div>
            </div>
            
            {/* Floating Elements */}
            <div className="absolute -top-4 -right-4 bg-neon-pink text-primary-foreground px-4 py-2 rounded-full text-sm font-semibold animate-bounce">
              50% OFF
            </div>
            <div className="absolute -bottom-4 -left-4 bg-neon-green text-primary-foreground px-4 py-2 rounded-full text-sm font-semibold animate-bounce" style={{animationDelay: '0.5s'}}>
              Free Delivery
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};