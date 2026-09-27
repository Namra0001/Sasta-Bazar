-- Create trigger to update product stock and sold_count when order status changes to delivered
CREATE TRIGGER update_stock_on_order_delivery
AFTER INSERT OR UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.update_product_stock_on_delivery();