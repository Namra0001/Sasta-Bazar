import { useState } from "react";
import { Button } from "@/components/ui/button";

interface CategoryFilterProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

const subcategories = [
  { id: "men", label: "Men's Wear", image: "https://images.unsplash.com/photo-1617137968427-85924c800a22?w=150&q=80" },
  { id: "women", label: "Women's Wear", image: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=150&q=80" },
  { id: "shirts", label: "Shirts", image: "https://encrypted-tbn3.gstatic.com/shopping?q=tbn:ANd9GcRk3uLF5yEQ6AJlVYaK9dKAvIbbb700TErPWMyLRLygF-Vr1o-V4d0nwEnKEYQ5ifALSDoV3ejpjqPAfjw7DgPrMCQA6JvjXQ" },
  { id: "jeans", label: "Jeans", image: "https://encrypted-tbn2.gstatic.com/shopping?q=tbn:ANd9GcT1WFHt2dsiCJbd7pp2HnJndDGV8wtqGM7B5jnUoXBQBRZuOXAt75NqeiMLn7337iqc6ueX5tmSMqEJ4gXCT2qWoc2FyD5unLgFe8RbjcZLKFDQ5sXPmehkXA"},
  { id: "dresses", label: "Dresses", image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRWKtL8S8ZHdOT-wp_5dvBciPXoVEOVjjlvW4BKbinppw&s=10" },
  { id: "jackets", label: "Jackets", image: "https://encrypted-tbn3.gstatic.com/shopping?q=tbn:ANd9GcRnNtmRC5b2KQtBsalPszCVbHa-JkY9iE2hqmjzUtRanEzcnRVZojJ_cGtvsn_QrJ0BrIoQx06cECOowWOtevl0SxYc-6Ed" },
  { id: "blazers", label: "Blazers", image: "https://encrypted-tbn0.gstatic.com/shopping?q=tbn:ANd9GcQVCp8nciTIf7jRKqKSVlRuixTkuNGexcmJ48Nxil7jcr6f5R80F-1Fiv_FsVL1C89Lb3OF6ByaRHPQ9BTUX0t7fJOOJFYVkOcdRV3U-lIgHgnIsQyJinTEIQ" },
  { id: "skirts", label: "Skirts", image: "https://encrypted-tbn0.gstatic.com/shopping?q=tbn:ANd9GcQmVjRzywJVohHI4VfyfHzmhkLLGatrjG5NL8vy1-I3_KKe9erEJlhfU2ISXRXipN7k4HoN5c8u_V31vwF6tgf2UlncTkYUGal2jLrm_9-wZKi0RJ9otGMW" },
  { id: "accessories", label: "Accessories", image: "data:image/jpeg;base64,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" }
];

export const CategoryFilter = ({
  selectedCategory,
  onCategoryChange
}: CategoryFilterProps) => {
  const [showAllCategories, setShowAllCategories] = useState(false);

  const handleCategoryClick = (categoryId: string) => {
    onCategoryChange(categoryId);
  };

  return (
    <div className="mb-6 bg-white rounded-xl shadow-sm border border-slate-100 py-2 px-4 overflow-hidden">
      <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Categories</h3>
      
      <div className="flex flex-wrap justify-center gap-2 text-center">
        {subcategories.map((category, index) => (
          <div 
            key={category.id}
            onClick={() => handleCategoryClick(category.id)}
            className={`flex-col items-center justify-start cursor-pointer group transition-all duration-300 p-1 rounded-lg w-20 ${selectedCategory === category.id ? 'bg-slate-50 ring-1 ring-slate-200' : 'hover:bg-slate-50'} ${!showAllCategories && index >= 3 ? 'hidden sm:flex' : 'flex'}`}
          >
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-2 overflow-hidden shadow-inner group-hover:shadow-md transition-shadow">
              <img 
                src={category.image} 
                alt={category.label}
                className="w-full h-full object-cover rounded-full group-hover:scale-110 transition-transform duration-300"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "https://picsum.photos/150"; 
                }}
              />
            </div>
            <span className={`text-[10px] sm:text-xs leading-tight transition-colors ${selectedCategory === category.id ? 'font-bold text-orange-600' : 'text-slate-600 group-hover:text-slate-900'}`}>
              {category.label}
            </span>
          </div>
        ))}
      </div>

      {!showAllCategories && (
        <div className="mt-4 flex justify-center sm:hidden">
          <Button variant="outline" size="sm" onClick={() => setShowAllCategories(true)} className="rounded-full px-6">
            See All Categories
          </Button>
        </div>
      )}
    </div>
  );
};