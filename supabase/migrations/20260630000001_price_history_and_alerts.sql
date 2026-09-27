-- Create price_history table
CREATE TABLE public.price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  price INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read price history" ON public.price_history FOR SELECT TO public USING (true);

-- Trigger to record price history automatically
CREATE OR REPLACE FUNCTION public.record_price_history()
RETURNS TRIGGER AS 
BEGIN
  IF (TG_OP = 'INSERT') OR (TG_OP = 'UPDATE' AND OLD.price IS DISTINCT FROM NEW.price) THEN
    INSERT INTO public.price_history (product_id, price)
    VALUES (NEW.id, NEW.price);
  END IF;
  RETURN NEW;
END;
 LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_product_price_change
  AFTER INSERT OR UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.record_price_history();

-- Populate existing products into price_history
INSERT INTO public.price_history (product_id, price, created_at)
SELECT id, price, created_at FROM public.products;

-- Create price_alerts table
CREATE TABLE public.price_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  target_price INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own price alerts" ON public.price_alerts FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
