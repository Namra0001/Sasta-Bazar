-- Update trigger function to include 'received' status
CREATE OR REPLACE FUNCTION public.update_product_stock_on_delivery()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  item JSONB;
  item_quantity INTEGER;
  item_product_id UUID;
BEGIN
  -- Only process when order status changes to delivered, completed, or received
  IF (TG_OP = 'UPDATE' AND NEW.status IN ('delivered', 'completed', 'received') AND OLD.status != NEW.status)
     OR (TG_OP = 'INSERT' AND NEW.status IN ('delivered', 'completed', 'received')) THEN
    
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
$function$;