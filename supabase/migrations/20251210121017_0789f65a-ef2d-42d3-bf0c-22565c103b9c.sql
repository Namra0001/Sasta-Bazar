-- Drop duplicate stock update triggers, keep only one
DROP TRIGGER IF EXISTS trigger_update_stock_on_order ON orders;
DROP TRIGGER IF EXISTS trigger_update_stock_on_delivery ON orders;

-- Drop the duplicate function
DROP FUNCTION IF EXISTS public.update_product_stock_and_sales();

-- Keep only one trigger for stock updates
-- Trigger update_stock_on_order_delivery already exists with update_product_stock_on_delivery function