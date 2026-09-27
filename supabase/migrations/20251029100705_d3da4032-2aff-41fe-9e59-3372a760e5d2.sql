-- Create function to update product stock and sales after order
CREATE OR REPLACE FUNCTION update_product_stock_and_sales()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update when order status changes to a completed state
  IF (TG_OP = 'UPDATE' AND NEW.status IN ('delivered', 'completed')) 
     OR (TG_OP = 'INSERT' AND NEW.status IN ('delivered', 'completed')) THEN
    
    -- Update stock and sold_count for each item in the order
    DECLARE
      item JSONB;
    BEGIN
      FOR item IN SELECT * FROM jsonb_array_elements(NEW.items)
      LOOP
        UPDATE products
        SET 
          stock = stock - (item->>'quantity')::integer,
          sold_count = sold_count + (item->>'quantity')::integer
        WHERE id = (item->>'product_id')::uuid;
      END LOOP;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for order updates
DROP TRIGGER IF EXISTS trigger_update_stock_on_order ON orders;
CREATE TRIGGER trigger_update_stock_on_order
  AFTER INSERT OR UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_product_stock_and_sales();