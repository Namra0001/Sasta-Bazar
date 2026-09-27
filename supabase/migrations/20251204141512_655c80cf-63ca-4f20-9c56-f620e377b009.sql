-- Add video_url column to product_reviews
ALTER TABLE public.product_reviews 
ADD COLUMN IF NOT EXISTS video_url text;

-- Create trigger to update product rating when review is added/updated
DROP TRIGGER IF EXISTS on_review_added ON public.product_reviews;
CREATE TRIGGER on_review_added
  AFTER INSERT OR UPDATE ON public.product_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_product_rating();