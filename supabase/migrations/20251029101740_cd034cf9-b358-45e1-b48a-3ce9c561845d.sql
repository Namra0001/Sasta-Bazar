-- Function to update product stock and sales when order is delivered
CREATE OR REPLACE FUNCTION update_product_stock_on_delivery()
RETURNS TRIGGER AS $$
DECLARE
  item JSONB;
  item_quantity INTEGER;
  item_product_id UUID;
BEGIN
  -- Only process when order status changes to delivered or completed
  IF (TG_OP = 'UPDATE' AND NEW.status IN ('delivered', 'completed') AND OLD.status != NEW.status)
     OR (TG_OP = 'INSERT' AND NEW.status IN ('delivered', 'completed')) THEN
    
    -- Loop through each item in the order
    FOR item IN SELECT * FROM jsonb_array_elements(NEW.items)
    LOOP
      item_quantity := (item->>'quantity')::integer;
      item_product_id := (item->>'product_id')::uuid;
      
      -- Update stock and sold_count for the product
      UPDATE products
      SET 
        stock = GREATEST(0, stock - item_quantity),
        sold_count = sold_count + item_quantity
      WHERE id = item_product_id;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop trigger if exists and create new one
DROP TRIGGER IF EXISTS trigger_update_stock_on_delivery ON orders;

CREATE TRIGGER trigger_update_stock_on_delivery
  AFTER INSERT OR UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_product_stock_on_delivery();